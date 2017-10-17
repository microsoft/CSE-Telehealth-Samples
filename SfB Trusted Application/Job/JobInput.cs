// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore
{
    /// <summary>
    /// The job types
    /// </summary>
    public enum JobType
    {
        /// <summary>
        /// ImBridge demo
        /// </summary>
        GetAnonToken,

        /// <summary>
        /// Get adhoc meeting from Application directly
        /// </summary>
        AdhocMeeting
    }

    /// <summary>
    /// Base class for job input from application level
    /// </summary>
    public abstract class PlatformServiceJobInputBase
    {
    }


    /// <summary>
    /// Get AnonToken job input
    /// </summary>
    public class GetAnonTokenInput : PlatformServiceJobInputBase
    {
        public string AllowedOrigins { get; set; }
        public string ApplicationSessionId { get; set; }
        public string MeetingUrl { get; set; }
    }

    /// <summary>
    /// We may not need this class for a simple web role model, but if we want to have a queue and need another process to
    /// pick up job from queue, we need this class to indicate which job and what is the job input.
    /// </summary>
    public class PlatformServiceSampleJobConfiguration
    {
        /// <summary>
        /// get or set the job type
        /// </summary>
        public JobType JobType { get; set; }

        /// <summary>
        /// The get anon token job input
        /// </summary>
        public GetAnonTokenInput AnonTokenJobInput { get; set; }


        public GetAdhocMeetingResourceInput GetAdhocMeetingResourceInput { get; set; }
    }


    /// <summary>
    /// Get adhocmeeting resource job input
    /// </summary>
    public class GetAdhocMeetingResourceInput : PlatformServiceJobInputBase
    {
        public string Subject { get; set; }
        public string Description { get; set; }
        public string AccessLevel { get; set; }
        public bool EntryExitAnnouncement { get; set; }
        public bool AutomaticLeaderAssignment { get; set; }
        public bool PhoneUserAdmission { get; set; }
        public bool LobbyBypassForPhoneUsers { get; set; }
    }
}