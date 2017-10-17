// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System.Web.Mvc;

namespace CSETHSamples_WebPortal.Controllers
{
    [Authorize]
    public class LauncherController : Controller
    {
        public ActionResult Virtual()
        {
            return View();
        }

        public ActionResult Desktop()
        {
            return View();
        }
    }
}