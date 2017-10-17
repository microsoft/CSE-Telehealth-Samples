// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System.Net;
using System.Net.Http;
using System.Web.Http.Filters;

namespace CSETHSamples_API.Filters
{
    public class HandleApiExceptionAttribute : ExceptionFilterAttribute
    {
        public override void OnException(HttpActionExecutedContext context)
        {
            var request = context.ActionContext.Request;

            var response = new
            {
                errorCode = context.Exception.Data["code"],
                errorMessage = context.Exception.Data["message"]
            };

            context.Response = request.CreateResponse(HttpStatusCode.BadRequest, response);
        }
    }
}