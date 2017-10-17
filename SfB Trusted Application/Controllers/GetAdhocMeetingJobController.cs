// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore;
using Microsoft.SfB.PlatformService.SDK.Common;
using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.ApplicationInsights;

namespace CSETHSamples_TrustedApp
{
    [MyCorsPolicy]
    public class GetAdhocMeetingJobController : JobControllerBase
    {
        private TelemetryClient telemetry;

        public GetAdhocMeetingJobController() : base()
        {
            telemetry = new TelemetryClient();
        }

        public async Task<HttpResponseMessage> Post(GetAdhocMeetingResourceInput input)
        {
            string jobId = Guid.NewGuid().ToString("N");


            try
            {
                PlatformServiceSampleJobConfiguration jobConfig = new PlatformServiceSampleJobConfiguration
                {
                    JobType = JobType.AdhocMeeting,
                    GetAdhocMeetingResourceInput = input
                };
                var job = PlatformServiceClientJobHelper.GetJob(jobId, WebApiApplication.InstanceId, WebApiApplication.AzureApplication, jobConfig) as GetAdhocMeetingJob;

                if (job == null)
                {
                    return CreateHttpResponse(System.Net.HttpStatusCode.BadRequest, "Invalid job input or job type");
                }

                AdhocMeetingToken token = await job.ExecuteCoreWithResultAsync<AdhocMeetingToken>().ConfigureAwait(false);
                if (token == null)
                {
                    return CreateHttpResponse(System.Net.HttpStatusCode.InternalServerError, string.Format("Unable to start a job run"));
                }

                var httpResponse = this.Request.CreateResponse(HttpStatusCode.OK, token);
                return httpResponse;
            }
            catch (Exception ex)
            {
                telemetry.TrackException(ex);
                Logger.Instance.Error(ex, "Exception happened in schedule job");
                return CreateHttpResponse(System.Net.HttpStatusCode.InternalServerError, string.Format("Unable to start a job run"));
            }
        }
    }
}
