// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System;

namespace Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore
{
    /// <summary>
    /// The AdhocMeetingResource Resource.
    /// </summary>
    public class AdhocMeetingToken
    {
        /// <summary>
        /// Gets or sets the anonymous token.
        /// </summary>
        public string OnlineMeetingUri
        {
            get;
            set;
        }

        public string JoinUrl
        {
            get;
            set;
        }
    }
}
