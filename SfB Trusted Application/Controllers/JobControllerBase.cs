// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore;
using Microsoft.SfB.PlatformService.SDK.Common;
using System.Net.Http;
using System.Web.Http;
using System.Net;
using System.Net.Http.Headers;

namespace CSETHSamples_TrustedApp
{
    public abstract class JobControllerBase : ApiController
    {

        public JobControllerBase()
        {
        }

        protected HttpResponseMessage CreateHttpResponse(HttpStatusCode statusCode, string message)
        {
            var response = new HttpResponseMessage(statusCode);
            if (message != null)
            {
                response.Content = new StringContent(message);
                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
            }
            return response;
        }
    }
}