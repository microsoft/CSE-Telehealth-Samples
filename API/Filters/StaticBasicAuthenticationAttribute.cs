// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.AspNet.Identity.Owin;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Configuration;

namespace CSETHSamples_API.Filters
{
    public class StaticBasicAuthenticationAttribute : BasicAuthenticationAttribute
    {
        protected override async Task<IPrincipal> AuthenticateAsync(string username, string password, CancellationToken cancellationToken)
        {
            var validUsername = WebConfigurationManager.AppSettings["API_Username"];
            var validPassword = WebConfigurationManager.AppSettings["API_Password"];

            cancellationToken.ThrowIfCancellationRequested(); // Unfortunately, UserManager doesn't support CancellationTokens.
            if (validUsername != username || validPassword != password)
            {
                // No user with userName/password exists.
                return null;
            }

            // Create a ClaimsIdentity with all the claims for this user.
            cancellationToken.ThrowIfCancellationRequested(); // Unfortunately, IClaimsIdenityFactory doesn't support CancellationTokens.
            ClaimsIdentity identity = new ClaimsIdentity("Basic");
            return new ClaimsPrincipal(identity);
        }
    }
}