// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(CSETHSamples_API.Startup))]

namespace CSETHSamples_API
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            
        }
    }
}
