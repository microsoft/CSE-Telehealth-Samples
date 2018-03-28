// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System;
using System.Web.Mvc;
using Microsoft.AspNet.SignalR;
using System.Web.Configuration;
using System.Linq;
using System.Net;
using System.IO;
using System.Xml.Linq;

namespace CSETHSamples_WebPortal.Controllers
{
    [System.Web.Mvc.Authorize]
    [RoutePrefix("MeetingPortal")]
    public class MeetingPortalController : Controller
    {
        private XDocument GetMeetingInfo(Uri meetingJoinUrl)
        {
            // Get the meeting details in XML format
            HttpWebRequest request = System.Net.WebRequest.Create(meetingJoinUrl) as System.Net.HttpWebRequest;
            request.Method = "GET";
            request.KeepAlive = true;
            request.Accept = "Application/vnd.microsoft.lync.meeting+xml";
            request.AllowAutoRedirect = true;
            request.UserAgent = "CSE Telehealth Samples/1.0.0";

            string responseXml = string.Empty;
            using (HttpWebResponse httpResponse = request.GetResponse() as System.Net.HttpWebResponse)
            {
                using (StreamReader reader = new System.IO.StreamReader(httpResponse.GetResponseStream()))
                {
                    responseXml = reader.ReadToEnd();
                }
            }
            return XDocument.Parse(responseXml);
        }

        private void SetupViewBagForSkype(Uri meetingJoinUrl)
        {
            string meetingConferenceUri = "";
            string meetingId = "";
            string meetingJoinUrlStr = "";
            if (meetingJoinUrl != null)
            {
                // Check if this host is known
                var validHosts = WebConfigurationManager.AppSettings["ValidMeetingJoinHosts"].Split(' ');
                if (!validHosts.Contains(meetingJoinUrl.Host))
                {
                    throw new Exception(string.Format("Access to host of meeting join URL '{0}' is not permitted.", meetingJoinUrl));
                }
                var meetingInfoXml = GetMeetingInfo(meetingJoinUrl);
                var ns = meetingInfoXml.Root.GetDefaultNamespace();
                meetingConferenceUri = meetingInfoXml.Descendants(ns + "conf-uri").First().Value;
                meetingId = meetingInfoXml.Descendants(ns + "conf-key").First().Value;
                meetingJoinUrlStr = meetingJoinUrl.ToString();
            }
            
            ViewBag.MeetingConferenceUri = meetingConferenceUri;
            ViewBag.MeetingJoinUrl = meetingJoinUrlStr;
            ViewBag.MeetingId = meetingId;
            ViewBag.ClientId = WebConfigurationManager.AppSettings["AAD_Native_ClientId"];
            ViewBag.SkypeUseConversationControl = WebConfigurationManager.AppSettings["SkypeUseConversationControl"];
            ViewBag.SkypeServiceUrl = WebConfigurationManager.AppSettings["SkypeServiceUrl"];
            ViewBag.WebPortalBaseUrl = WebConfigurationManager.AppSettings["WebPortalBaseUrl"];
            ViewBag.APIBaseUrl = WebConfigurationManager.AppSettings["APIBaseUrl"];
            ViewBag.IsAuthenticated = Request.IsAuthenticated.ToString().ToLower();
        }

        [AllowAnonymous]
        [Route("DeviceTest")]
        public ActionResult DeviceTest()
        {
            SetupViewBagForSkype(null);
            return View("DeviceTest");
        }

        [AllowAnonymous]
        [Route("DeviceTest/{*meetingJoinUrl}")]
        public ActionResult DeviceTestVerified(string meetingJoinUrl)
        {
            SetupViewBagForSkype(new Uri("https://" + meetingJoinUrl));
            return View("DeviceTest");
        }

        [AllowAnonymous]
        [Route("Join/Patient/{*meetingJoinUrl}")]
        public ActionResult PatientJoin(string meetingJoinUrl)
        {
            SetupViewBagForSkype(new Uri("https://" + meetingJoinUrl));
            if (ViewBag.SkypeUseConversationControl == "true")
            {
                // Styling conflicts exist between Skype CC and Bootstrap.
                ViewBag.NoBootstrap = true;
            }
            return View("PatientJoin");
        }

        [Route("Join/Clinic/{*meetingJoinUrl}")]
        public ActionResult ClinicJoin(string meetingJoinUrl)
        {
            SetupViewBagForSkype(new Uri("https://" + meetingJoinUrl));
            var hub = GlobalHost.ConnectionManager.GetHubContext<URIPassthroughHub>();
            hub.Clients.User(User.Identity.Name).HandleURI("conf:" + ViewBag.MeetingConferenceUri);
            return View("ClinicJoin");
        }
    }
}
