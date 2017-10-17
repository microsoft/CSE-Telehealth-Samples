// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.ApplicationInsights;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Web.Configuration;
using System.Web.Http;

namespace CSETHSamples_API.Controllers
{
    public class MeetingRequestUCWA
    {
        public string subject { get; set; }
        public string description { get; set; }
        public string accessLevel { get; set; }
        public string expirationTime { get; set; }
        public List<string> attendees { get; set; }
        public string automaticLeaderAssignment { get; set; }
    }

    public class MeetingRequest
    {
        public string meetingId { get; set; }
        public string subject { get; set; }
        public string description { get; set; }
        public string expirationTime { get; set; }
        public List<string> attendees { get; set; }
    }

    public class MeetingResponse
    {
        public string patientJoinUri { get; set; }
        public string clinicJoinUri { get; set; }
        public string deviceTestUri { get; set; }
        public dynamic raw { get; set; }
    }

    [Authorize]
    public class MeetingController : ApiController
    {
        private const string ucwaPassMeString = "please pass this in a PUT request";
        private const int ucwaMaxRedirection = 5;
        private Uri ucwaDefaultAutodiscoverUri = new Uri("https://webdir.online.lync.com/autodiscover/autodiscoverservice.svc/root");
        private string clientId = WebConfigurationManager.AppSettings["AAD_ClientId"];
        private string username = WebConfigurationManager.AppSettings["UCWA_Username"];
        private string password = WebConfigurationManager.AppSettings["UCWA_Password"];
        private string authorityUri = "https://login.windows.net/common/oauth2/authorize";
        private TelemetryClient telemetry;

        public MeetingController() : base()
        {
            telemetry = new TelemetryClient();
        }

        private async Task<string> GetAADToken(string authorityUri, string clientId, UserPasswordCredential pwdCred, string resourceUri)
        {
            string token = null;
            try
            {
                AuthenticationContext authContext = new AuthenticationContext(authorityUri);
                var result = await authContext.AcquireTokenAsync(resourceUri, clientId, pwdCred);
                token = result.AccessToken;
            }
            catch (Exception)
            {
                throw;
            }

            return token;
        }

        // Calls root autodiscover URI to get the user resource URI
        private Uri UcwaRootAutoDiscovery(Uri rootDiscoverUri, int redirectionCount = 0) {
            if (redirectionCount > ucwaMaxRedirection)
            {
                throw CreateAPIError("3", "Maximum redirection count exceeded during root autodiscovery.");
            }
            var request = this.CreateUCWARequest(rootDiscoverUri.ToString(), "GET", null);
            var response = this.GetResponse(request);
            dynamic tmp = JsonConvert.DeserializeObject(response);
            try
            {
                Uri redirectUri = new Uri(tmp._links.redirect.href.ToString());
                return UcwaRootAutoDiscovery(redirectUri, redirectionCount + 1);
            }
            catch
            {
                string userResource = tmp._links.user.href;
                return new Uri(userResource);
            }
        }

        // Calls user resource URI to get the applications resource URI
        private async Task<Uri> UcwaUserDiscovery(Uri userDiscoverUri, int redirectionCount = 0)
        {
            if (redirectionCount > ucwaMaxRedirection)
            {
                throw CreateAPIError("3", "Maximum redirection count exceeded during user autodiscovery.");
            }
            var pwdCred = new UserPasswordCredential(username, password);
            string resource = userDiscoverUri.GetLeftPart(System.UriPartial.Authority);
            string accessToken = await this.GetAADToken(authorityUri, clientId, pwdCred, resource);

            var request = this.CreateUCWARequest(userDiscoverUri.ToString(), "GET", accessToken);
            var response = this.GetResponse(request);
            dynamic tmp = JsonConvert.DeserializeObject(response);
            try
            {
                // redirect doesn't include /oauth/user for whatever reason
                var redirectUri = new Uri(tmp._links.redirect.href.ToString() + "/oauth/user");
                return await UcwaUserDiscovery(redirectUri, redirectionCount + 1);
            }
            catch
            {
                string applicationsResource = tmp._links.applications.href;
                return new Uri(applicationsResource);
            }
        }

        private async Task<dynamic> AuthenticateUCWA()
        {
            string resource = "";
            string accessToken = "";
            UserPasswordCredential pwdCred = new UserPasswordCredential(username, password);

            Uri userResource = UcwaRootAutoDiscovery(ucwaDefaultAutodiscoverUri);
            Uri appResource = await UcwaUserDiscovery(userResource);

            resource = appResource.GetLeftPart(System.UriPartial.Authority);
            accessToken = await this.GetAADToken(authorityUri, clientId, pwdCred, resource);

            var request = this.CreateUCWARequest(appResource.ToString(), "POST", accessToken);
            var response = this.GetResponse(request);

            dynamic tmp = JsonConvert.DeserializeObject(response);
            string onlineMeetingURL = resource + tmp._embedded.onlineMeetings._links.myOnlineMeetings.href;
            return new { accessToken = accessToken, onlineMeetingURL = onlineMeetingURL };
        }

        private HttpWebRequest CreateUCWARequest(string uri, string method, string accessToken)
        {
            string clientId = WebConfigurationManager.AppSettings["AAD_ClientId"];
            string tenantName = WebConfigurationManager.AppSettings["AAD_TenantName"];
            HttpWebRequest request;

            if (method == "POST")
            {
                string json = "{ \"UserAgent\":\"UCWA Sample\", \"endpointId\":\"" + clientId + "\", \"Culture\":\"en-US\",\"DomainName\":\"" + tenantName + "\"}";
                request = CreateRequest(uri, method, accessToken, "application/json", json);
            }
            else
            {
                request = CreateRequest(uri, method, accessToken, "application/json");
                request.ContentLength = 0;
            }

            return request;
        }

        private HttpWebRequest CreateRequest(string uri, string method, string accessToken)
        {
            HttpWebRequest request = System.Net.WebRequest.Create(uri) as System.Net.HttpWebRequest;
            request.KeepAlive = true;
            request.Method = method;

            if (!string.IsNullOrEmpty(accessToken))
            {
                request.Headers.Add("Authorization", string.Format("Bearer {0}", accessToken));
            }
            return request;
        }

        private HttpWebRequest CreateRequest(string uri, string method, string accessToken, string contentType)
        {
            HttpWebRequest request = CreateRequest(uri, method, accessToken);
            request.ContentType = contentType;
            return request;
        }

        private HttpWebRequest CreateRequest(string uri, string method, string accessToken, string contentType, string body)
        {
            HttpWebRequest request = CreateRequest(uri, method, accessToken, contentType);
            SendRequestBody(request, body);
            return request;
        }

        private void SendRequestBody(HttpWebRequest request, string body)
        {
            request.ContentLength = body.Length;
            using (var streamWriter = new StreamWriter(request.GetRequestStream()))
            {
                streamWriter.Write(body);
                streamWriter.Flush();
            }
        }

        private string GetResponse(HttpWebRequest request)
        {
            string response = string.Empty;

            using (HttpWebResponse httpResponse = request.GetResponse() as System.Net.HttpWebResponse)
            {
                ////Get StreamReader that holds the response stream
                using (StreamReader reader = new System.IO.StreamReader(httpResponse.GetResponseStream()))
                {
                    response = reader.ReadToEnd();
                }
            }

            return response;
        }

        private Exception CreateAPIError(string errorCode, string errorMessage)
        {
            Exception ex = new Exception(string.Format("{0}: {1}", errorCode, errorMessage));
            ex.Data.Add("code", errorCode);
            ex.Data.Add("message", errorMessage);
            return ex;
        }

        private List<string> PreprocessAttendeeList(List<string> originalAttendees)
        {
            List<string> attendees = new List<string>();
            for (int i = 0; i < originalAttendees.Count; i++)
            {
                if (!originalAttendees[i].ToLower().StartsWith("sip:"))
                {
                    attendees.Add("sip:" + originalAttendees[i]);
                }
                else
                {
                    attendees.Add(originalAttendees[i]);
                }
            }
            return attendees;
        }

        // PUT api/meeting
        // https://msdn.microsoft.com/en-us/skype/ucwa/updateanonlinemeeting
        public async Task<dynamic> Put([FromBody]MeetingRequest mreq)
        {
            if (mreq.meetingId == null)
            {
                throw CreateAPIError("0", "Request is missing the required field 'meetingId'");
            }

            dynamic authDetails;
            try
            {
                authDetails = await AuthenticateUCWA();
            }
            catch (Exception ex)
            {
                telemetry.TrackException(ex);
                throw CreateAPIError("3", "Could not authenticate to UCWA.");
            }
            string meetingManagementURL = authDetails.onlineMeetingURL + "/" + mreq.meetingId;

            // Extract the magic etag value & GUID that need to be passed in PUT operations
            string guid = "";
            string etag = "";
            try
            {
                HttpWebRequest req = CreateRequest(meetingManagementURL, "GET", authDetails.accessToken);
                string res = GetResponse(req);
                dynamic jsonResponse = JsonConvert.DeserializeObject(res);
                etag = jsonResponse.etag.ToString();
                foreach (var x in jsonResponse)
                {
                    if (x.Value.ToString() == ucwaPassMeString)
                    {
                        guid = x.Name.ToString();
                    }
                }
            }
            catch (Exception ex)
            {
                telemetry.TrackException(ex);
                throw CreateAPIError("2", "Could not retrieve meeting information from UCWA");
            }

            // Issue the PUT request based on passed values
            try
            {
                MeetingRequestUCWA meeting = new MeetingRequestUCWA();
                meeting.attendees = PreprocessAttendeeList(mreq.attendees);
                meeting.accessLevel = "Invited";
                meeting.automaticLeaderAssignment = "SameEnterprise";
                meeting.subject = mreq.subject;
                meeting.description = mreq.description;
                meeting.expirationTime = mreq.expirationTime;

                JObject o = JObject.FromObject(meeting);
                o.Add("onlineMeetingId", mreq.meetingId);
                o.Add(guid, ucwaPassMeString);
                var json = o.ToString();

                HttpWebRequest req = CreateRequest(meetingManagementURL, "PUT", authDetails.accessToken, "application/json");
                req.Headers.Add("If-Match", '"' + etag + '"');
                SendRequestBody(req, json);

                var res = GetResponse(req);
                return JsonConvert.DeserializeObject(res);
            }
            catch (Exception ex)
            {
                telemetry.TrackException(ex);
                throw CreateAPIError("1", "Unexpected error occurred.");
            }
        }

        // POST api/meeting
        // https://msdn.microsoft.com/en-us/skype/ucwa/scheduleanonlinemeeting
        public async Task<MeetingResponse> Post([FromBody]MeetingRequest mreq)
        {
            dynamic authDetails;
            try
            {
                authDetails = await AuthenticateUCWA();
            }
            catch (Exception ex)
            {
                telemetry.TrackException(ex);
                throw CreateAPIError("3", "Could not authenticate to UCWA.");
            }

            try
            {
                MeetingRequestUCWA meeting = new MeetingRequestUCWA();
                meeting.attendees = PreprocessAttendeeList(mreq.attendees);
                meeting.accessLevel = "Invited";
                meeting.subject = mreq.subject;
                meeting.description = mreq.description;
                meeting.expirationTime = mreq.expirationTime;
                meeting.automaticLeaderAssignment = "SameEnterprise";
                string json = JsonConvert.SerializeObject(meeting);

                HttpWebRequest req = CreateRequest(authDetails.onlineMeetingURL, "POST", authDetails.accessToken, "application/json", json);
                string res = GetResponse(req);////Creates the onlne meeting.

                dynamic jsonResponse = JsonConvert.DeserializeObject(res);

                MeetingResponse response = new MeetingResponse();
                response.raw = jsonResponse;

                string baseUrl = WebConfigurationManager.AppSettings["WebPortalBaseUrl"];
                UriBuilder uri = new UriBuilder(baseUrl);

                // Strip 'https://' part out of meeting join URL
                var joinUri = new Uri(jsonResponse.joinUrl.ToString());
                var joinUrlComponents = joinUri.Host + joinUri.AbsolutePath;

                uri.Path = String.Format("/MeetingPortal/Join/Clinic/{0}", joinUrlComponents);
                response.clinicJoinUri = uri.ToString();

                uri.Path = String.Format("/MeetingPortal/Join/Patient/{0}", joinUrlComponents);
                response.patientJoinUri = uri.ToString();

                uri.Path = String.Format("/MeetingPortal/DeviceTest/{0}", joinUrlComponents);
                response.deviceTestUri = uri.ToString();

                return response;
            }
            catch (Exception ex)
            {
                telemetry.TrackException(ex);
                throw CreateAPIError("1", "Unexpected error occurred.");
            }
        }
    }
}
