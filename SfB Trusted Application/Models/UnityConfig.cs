// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.Azure;
using Microsoft.Practices.Unity;
using Microsoft.SfB.PlatformService.SDK.Samples.ApplicationCore;
using Microsoft.SfB.PlatformService.SDK.Common;

namespace CSETHSamples_TrustedApp
{
    /// <summary>
    /// The Unity Configuration.
    /// </summary>
    public static class UnityConfig
    {
        public static void RegisterComponents()
        {
            //Register global used interface implementation here
            var container = IOCHelper.DefaultContainer;
            container.RegisterType<IPlatformServiceLogger, ConsoleLogger>(new ContainerControlledLifetimeManager(),
               new InjectionFactory(c => new ConsoleLogger()));
        }
    }
}