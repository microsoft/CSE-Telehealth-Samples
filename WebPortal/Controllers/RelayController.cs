// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using CSETHSamples_WebPortal.Models;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Web.Configuration;
using System.Web.Mvc;

namespace CSETHSamples_WebPortal.Controllers
{
    public class RelayController : Controller
    {
        private HttpWebResponse SubmitData(string type, string body)
        {
            var endpointUrl = WebConfigurationManager.AppSettings["IntegrationEndpointUrl"];

            HttpWebRequest request = System.Net.WebRequest.Create(endpointUrl + "/" + type) as System.Net.HttpWebRequest;
            request.KeepAlive = true;
            request.Method = "POST";
            request.ContentType = "application/json";
            request.ContentLength = body.Length;
            using (var streamWriter = new StreamWriter(request.GetRequestStream()))
            {
                streamWriter.Write(body);
                streamWriter.Flush();
            }
            try
            {
                return (HttpWebResponse)request.GetResponse();
            }
            catch (Exception ex)
            {
                // TODO: Place your logic to handle the failure to relay a message to configured endpoint here
                return null;
            }
        }

        [HttpPost]
        public string CallQualitySurvey(CallQualitySurvey data)
        {
            // Relay data to appropriate endpoint here
            string json = JsonConvert.SerializeObject(data);
            SubmitData("CallQualitySurvey", json);
            return "Sent to endpoint";
        }

        [HttpPost]
        public string MeetingEndTime(MeetingEndTime data) {
            // Relay data to appropriate endpoint here
            string json = JsonConvert.SerializeObject(data);
            SubmitData("MeetingEndTime", json);
            return "Sent to endpoint";
        }

        [HttpPost]
        public string DeviceCheck(DeviceCheckStatus data)
        {
            // Relay data to appropriate endpoint here
            string json = JsonConvert.SerializeObject(data);
            SubmitData("DeviceCheckStatus", json);
            return "Sent to endpoint";
        }

        [HttpGet]
        [Route("Relay/Receiver")]
        public string Receiver(bool clear = false)
        {
            // Reads back the data collected by the sample receiver below.
            // Optional query string ?clear=true will empty the file.
            if (clear)
            {
                using (System.IO.StreamWriter file = new System.IO.StreamWriter(Path.Combine(Path.GetTempPath(), @"recieved.txt")))
                {
                    file.Write("");
                }
            }
            Response.ContentType = "application/json";
            string data = "";
            using (System.IO.StreamReader file = new System.IO.StreamReader(Path.Combine(Path.GetTempPath(), @"recieved.txt")))
            {
                data = file.ReadToEnd();
            }
            return data;
        }

        [HttpPost]
        [Route("Relay/Receiver/{type}")]
        public string Receiver(string type, dynamic data)
        {
            // Sample logic for handling the incoming POSTs - here we just write it to a file %TEMP%/recieved.txt.
            var req = Request.InputStream;
            Request.InputStream.Position = 0;
            var json = new StreamReader(req).ReadToEnd();
            using (System.IO.StreamWriter file =
            new System.IO.StreamWriter(Path.Combine(Path.GetTempPath(), @"recieved.txt"), true))
            {
                file.WriteLine(json);
            }
            return json;
        }
    }
}