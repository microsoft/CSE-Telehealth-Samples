// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System.Web;
using System.Web.Mvc;

namespace CSETHSamples_WebPortal
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new ErrorHandler.AiHandleErrorAttribute());
        }
    }
}
