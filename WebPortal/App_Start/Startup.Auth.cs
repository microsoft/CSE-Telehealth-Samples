// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using System;
using System.Configuration;
using System.IdentityModel.Claims;
using System.Threading.Tasks;
using System.Web;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.Cookies;
using Microsoft.Owin.Security.OpenIdConnect;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using Owin;
using CSETHSamples_WebPortal.Models;
using System.IdentityModel.Tokens;
using Microsoft.Owin.Security.ActiveDirectory;

namespace CSETHSamples_WebPortal
{
    public partial class Startup
    {
        private static string clientId = ConfigurationManager.AppSettings["AAD_Web_ClientId"];
        private static string appKey = ConfigurationManager.AppSettings["AAD_Web_ClientSecret"];
        private static string aadInstance = ConfigurationManager.AppSettings["AAD_AuthorityUri"];
        private static string tenantId = ConfigurationManager.AppSettings["AAD_TenantId"];
        private static string domain = ConfigurationManager.AppSettings["AAD_Domain"];
        private static string postLogoutRedirectUri = ConfigurationManager.AppSettings["AAD_PostLogoutRedirectUri"];
        // TODO this redirect URI goes to a blank homepage, and is also different than /Content/token.html
        private static string redirectURI = ConfigurationManager.AppSettings["AAD_RedirectURI"];

        public static readonly string Authority = aadInstance + tenantId;

        // This is the resource ID of the AAD Graph API.  We'll need this to request a token to call the Graph API.
        string graphResourceId = "https://graph.windows.net";

        public void ConfigureAuth(IAppBuilder app)
        {
            ApplicationDbContext db = new ApplicationDbContext();
            app.SetDefaultSignInAsAuthenticationType(CookieAuthenticationDefaults.AuthenticationType);
            app.UseCookieAuthentication(new CookieAuthenticationOptions());

            app.UseWindowsAzureActiveDirectoryBearerAuthentication(new WindowsAzureActiveDirectoryBearerAuthenticationOptions
            {
                Tenant = domain,
                AuthenticationType = "OAuth2Bearer",
                TokenValidationParameters = new TokenValidationParameters
                {
                    ValidAudience = graphResourceId,
                    ValidateIssuer = false,
                }
            });

            app.UseOpenIdConnectAuthentication(new OpenIdConnectAuthenticationOptions
            {
                ClientId = clientId,
                Authority = Authority,
                PostLogoutRedirectUri = postLogoutRedirectUri,
                RedirectUri = redirectURI,

                Notifications = new OpenIdConnectAuthenticationNotifications()
                {
                    // If there is a code in the OpenID Connect response, redeem it for an access token and refresh token, and store those away.
                    AuthorizationCodeReceived = (context) =>
                    {
                        var code = context.Code;
                        ClientCredential credential = new ClientCredential(clientId, appKey);
                        string signedInUserID = context.AuthenticationTicket.Identity.FindFirst(ClaimTypes.NameIdentifier).Value;
                        Microsoft.IdentityModel.Clients.ActiveDirectory.AuthenticationContext authContext = new Microsoft.IdentityModel.Clients.ActiveDirectory.AuthenticationContext(Authority, new ADALTokenCache(signedInUserID));
                        AuthenticationResult result = authContext.AcquireTokenByAuthorizationCode(
                        code, new Uri(HttpContext.Current.Request.Url.GetLeftPart(UriPartial.Path)), credential, graphResourceId);

                        return Task.FromResult(0);
                    }
                }
            });
        }
    }
}
