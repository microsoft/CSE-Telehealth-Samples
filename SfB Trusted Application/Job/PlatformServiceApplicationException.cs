// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System;

namespace Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore
{
    [Serializable]
    public class PlatformserviceApplicationException : Exception
    {
        public PlatformserviceApplicationException(string errorMessage, Exception innerException = null) : base(errorMessage, innerException)
        {
        }
    }
}
