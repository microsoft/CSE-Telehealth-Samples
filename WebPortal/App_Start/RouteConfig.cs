// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System.Web.Mvc;
using System.Web.Routing;

namespace CSETHSamples_WebPortal
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapMvcAttributeRoutes();

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { action = "Index", id = "" }
            );
        }
    }
}
