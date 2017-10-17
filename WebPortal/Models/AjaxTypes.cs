// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System;

namespace CSETHSamples_WebPortal.Models
{
    public class CallQualitySurvey
    {
        public string meetingId { get; set; }
        public string callRating { get; set; }
        public bool audioIssues { get; set; }
        public string audioIssueList { get; set; }
        public bool videoIssues { get; set; }
        public string videoIssueList { get; set; }
        public string comments { get; set; }
        public string browser { get; set; }
    }

    public class MeetingEndTime
    {
        public string meetingId { get; set; }
        public string endTime { get; set; }
    }

    public class DeviceCheckStatusSpeedtest
    {
        public double ping { get; set; } = 0.0;
        public double up { get; set; } = 0.0;
        public double down { get; set; } = 0.0;
    }

    public class DeviceCheckStatusChecks
    {
        public DeviceCheckStatusSpeedtest speedtest { get; set; }
        public bool plugin { get; set; } = false;
        public bool peripherals { get; set; } = false;
    }

    public class DeviceCheckStatus
    {
        public string meetingId { get; set; }
        public DateTime timestamp { get; set; }
        public DeviceCheckStatusChecks checks { get; set; }
    }
}