# CSE Telehealth Samples
## About this code
This solution provides sample code for services that enable telehealth virtual visits between patients and care providers using Office 365. This solution is in the same spirit as the [Skype for Business healthcare templates](https://github.com/officedev/Virtual-Health-Templates), but aims to exemplify how to integrate a Skype for Business-powered virtual visit workflow into existing applications, such as an EMR or billing management software using REST APIs. It is intended to serve as a reference, and will likely need to be adjusted to match your particular workflow.

At a high level, it provides:
1. A web-based patient meeting join experience, including device test
2. A scheduling API to create virtual meeting rooms powered by Skype for Business
3. An API for relaying events and user feedback into 3rd party application(s) via REST calls. Example implementation that logs call quality, call length, a patient's device test status to a text file is included in these samples.
4. A workaround for VDI environments to launch Skype for Business on the desktop environment when clicking links in a virtual environment

## License
This project is licensed under the MIT license. See the included LICENSE file for details.

## Requirements
- Office 365 E3 or E5 tenant
- User with administrative privileges (to manage Azure AD, provide admin consent to applications and access the O365 admin portal).
- Azure subscription

## Deployment

### Planning
The solution contains 3 web application that will need to hosted in order to run through the end-to-end scenario:

| Project Name   |      Purpose    |  Default local test URL |
|----------|-------------|------|
| API |  Provides an API for 3rd party application to call and schedules meetings (wraps  the UCWA API). | http://localhost:35602 |
| Web Portal | Serves the web integrations (device test, clinic and patient meeting join experiences) as well as SignalR relay for facilitating clinic-side meeting launch. | https://localhost:44315 |
| SfB Trusted Application | Implements the Trusted Application API to ad-hoc meeting generation and allow guest meeting join. | https://localhost:44301 |

If you plan to deploy these, you will need to pick a FQDN for each. Azure App Service is the recommended mode of deployment, as you can easily deploy all three sites to one billing plan.

For local testing, proceed with directions below and use the local testing URLs noted above when configuring FQDNs in `Web.config` files.


### Azure AD application registration
Three Azure AD application registrations are required to deploy the solution:

1. Web Portal (Native): Enables use of UCWA and the Web SDK (delegated permissions) in the Web Portal, API and Tray Listener projects
2. Web Portal (Web/API): Enables AAD user authentication (delegated permissions) for the web portal
3. Trusted App (Web/API): Enables use of the Skype for Business Trusted App API (application permissions)

#### 1. Web SDK & UCWA
This AAD application will be used to authenticate the Web SDK and UCWA. In the Azure Portal, go to *Azure Active Directory (AAD) > App Registrations* and configure a new *Native* type application.
1. Under *Reply URLs*, remove the default reply URL and add two more:
    - `https://WebPortalFQDN/Content/token.html`
    - `https://WebPortalFQDN/`

    Refer to the table above for setting `WebPortalFQDN` if testing on a local machine with Visual Studio.
2. Under *Required Permissions*, select the *Skype for Business Online* API and grant it all available **delegated** permissions. If you can't find that API listed, try entering `Microsoft.Lync` into the search.
3. Close out the *Settings* blade to return to the application's essentials blade, and press the *Manifest* button to edit the application Manifest
    - Change the `oauth2AllowImplicitFlow` property to `true`, and save the manifest.

#### 2. Web Portal authentication
This AAD application will be used to authenticate users of the web portal. In the Azure Portal, go to *Azure Active Directory (AAD) > App Registrations* and configure a new *Web/API* type application.

1. Under *Reply URLs*, remove the default reply URL and add two more:
    - `https://WebPortalFQDN/Content/token.html`
    - `https://WebPortalFQDN/`
    
    Refer to the table above for setting `WebPortalFQDN` if testing on a local machine with Visual Studio.
2. Under *Required Permissions*, select the *Skype for Business Online* API and grant it all available **delegated** permissions. If you can't find that API listed, try entering `Microsoft.Lync` into the search.
3. Under *Keys*, add a client secret and copy its value - you will need it later.

#### 3. Trusted Application
This AAD application will be used by your Trusted App web service to authenticate against the Skype for Business Trusted Application API.

Use the [quick registration tool](https://aka.ms/skypeappregistration) to register a new Trusted Application (detailed registration instructions [here](https://msdn.microsoft.com/en-us/skype/trusted-application-api/docs/sfbregistration)):
1. Name your application something descriptive (e.g. `TelehealthTrustedApp`). Choose the first option, *I have not created an app in the Azure portal.* This is a new app, different from the web app you may have registered in the Azure portal.
2. Under application permissions, select *Create on-demand Skype meetings meetings*, *Join and Manage Skype Meetings meetings*, and *Guest user join services anonymous*.
3. Click *Create my application* and note down the application ID and client secret for later.
4. Open the consent URL in a new tab, and sign-in as your O365 tenant admin account again. After accepting the requested application premissions, you will be redirected to a 'page not found' - this is expected... You can close the tab/window.
5. Download and install the [Skype for Business Online Windows PowerShell Module](http://www.microsoft.com/en-us/download/details.aspx?id=39366)
6. Open a new PowerShell window and run: `Import-PSSession (New-CsOnlineSession -Credential (Get-Credential))`. Enter a O365 tenant admin account's credentials when prompted.
7. Paste the PowerShell line from the registration tool, replacing `sample_endpoint@domain.com` with your desired SIP endpoint (e.g. `telehealthApp@yourtenant.onmicrosoft.com`) and run it.
8. Save the resulting output in your records, it will come in handy if you ever need to alter the trusted application registration.

### Configure Web Portal & API projects
1. Adjust the AAD application, tenant, and endpoint parameters the Web Portal and API project's `Web.config` settings
    - Tip: You can obtain the AAD Tenant ID value by copying the *Organization ID* field when going to [portal.office.com](https://portal.office.com), clicking on the *Admin* tile and then selecting *Admin > Skype for Business* from the menu.
2. In the API project `Web.config`, enter the credentials for a licensed Office 365 in `UCWA_Username` and `UCWA_Password`. This user will act as a service account to create Skype for Business meetings.
3. Deploy the Web Portal and API projects to Azure App Service (they can share a billing plan)

If you wish to use the Tray Listener to launch meetings on the desktop environment (VDI workaround), fill the same AAD information as above in its `App.config` file.

### Configure Trusted Application API (optional - required for guest join)
1. Adjust the trusted application URL and AAD application details in the Trusted Application project's `Web.config` settings
2. Deploy an Azure Service Bus and general-purpose Storage account, and copy their primary connection strings into the trusted application project's `Web.config`
3. Deploy the trusted application project (it may share a single App Service Plan with the other projects if you choose)

### Application Insights
If you wish to use Application Insights, create an App Insights resource for each of the three web projects above and note down their Instrumentation Keys from the *Properties* blade in the Azure Portal. Edit the `ApplicationInsights.config` contained in each project folder and substitute the respective key into the `<InstrumentationKey>` element at the end of the file, then re-deploy the project to your App Service.

### Automated deployment to Azure
An ARM template is included to automatically create the three App Services as well as all dependenices. To use it, alter the `azuredeploy.parameters.json` file folder then run:
```
cd build
az group create --name YOUR_RG_NAME --location 'eastus'
az group deployment create --resource-group YOUR_RG_NAME --template-file azuredeploy.json --parameters @azuredeploy.parameters.json --mode Incremental
```
The connection strings for the Service Bus and Storage accounts are included in the deployment's outputs. As a next step, deploy the project code to the app services that were created.

## Usage
Keep in mind that your existing logins may interfere with the sequence below - the software will prefer any existing AAD logins instead of guest join, for example. It is helpful to use separate profiles or your browser's private browsing features when testing the CSE Telehealth Samples.

#### 1. Schedule meeting
Deploy a meeting using the API endpoint by sending a `POST` to `https://APIFQDN/api/Meeting`:

Headers:

    Authorization: Basic-auth-base64-header
    Content-Type: application/json

The authorization header should use the `API_Username` and `API_Password` credentials configured in the API project's `Web.config` file.

Body:

    {
      "subject": "Meeting subject",
      "description": "Meeting description",
      "attendees": ["doctorUser@yourTenant.onmicrosoft.com", "externalUser@otherTenant.com"],
      "expirationTime": "2017-12-12T00:00:00.000Z"
    }

Tip: the expiration date is in the future at the time of writing. Ensure you send a future date at the time you make the request.

The response should be three URLs plus the UCWA meeting information. Your application should store/process as appropriate.

#### 2. Patient Device Test
Open the device test URL (returned in step 1) and run through the device test. The device test results will be relayed to the configured endpoint.

#### 3. Clinic Join
1. Open Skype for Business (desktop client) and sign-in using the doctor's O365 account.
2. Run the desktop listener and sign-in with the doctor's O365 account, OR do the same at this URL and keep the page open: https://WebPortalFQDN/Launcher/Desktop
3. Open the clinic join URL in a private browsing session. The web portal will prompt for AAD authentication, then launch Skype for Business desktop into a meeting automatically.

#### 4. Patient Join
Open the device test URL in Edge. Once the patient is in the lobby, they wait until the doctor admits them to the meeting.

#### 5. Admit patient & start video
Doctor clicks the admit link on the clinic join page to kick off the meeting. They should start video in Skype for Business Desktop.

## FAQ
#### 1. What's the difference between an Azure AD Application, Trusted Application and the Trusted Application API?
This documentation has taken care to use careful wording given the ambiguous nature of the word *Application*.
- Azure AD Application: Used to authenticate users with Azure AD and request access to user resources, e.g. access to Skype for Business Online APIs.
- Trusted Application: Web service that implements (consumes) the Trusted App API so that it can interact with your tenant's users and Skype for Business meetings autonomously. In this code sample, it interacts with Skype for Business meetings upon request via a high-level REST API.
- Trusted Application API: API offered by Microsoft with Skype for Business Online

#### 2. What's the difference between the API project and the Trusted Application API?
The API project is meant to serve as *your own* API that 3rd party software can reach out to. In the code sample, an example method that encapsulates the UCWA authentication sequence and scheduling a Skype meeting into a single REST call for convineince purposes.

The Trusted Application API is hosted by Microsoft and provided as a part of the Skype for Business Online offerings and hosted by Microsoft. See #2 above.

#### 3. Can I deploy this as a multi-tenanted solution?

These samples are oriented towards a single-tenant deployment, however it is possible to allow **sign-in** from multiple tenants with some small modifications:
1. Set `ida:TenantId` to `common` in the web portal's Web.config
2. Add code to manually validate Bearer tokens in requets made against the web service - [sample here](https://github.com/Azure-Samples/active-directory-dotnet-webapp-multitenant-openidconnect/blob/master/TodoListWebApp/App_Start/Startup.Auth.cs).

A true multi-tenanted service has additional considerations:
1. The trusted application can only create ad-hoc meetings or guest join meetings in the tenant it is registered to. Unless you intend for all your users to join meetings under a common tenant, each tenant will need to register their own trusted application and have a copy of the trusted app web service deployed.
2. The API project will need to be altered to support creation of meetings in multiple tenants; either by dynamically swapping out the service account credentials, or by eliminated scheduled meetings altogether and switching to building meeting spaces on-demand via the Trusted Application API.
3. Collected user telemetry will need additional tagging so that the relay has enough context to route it towards the appropriate endpoints for that tenant.

#### 4. Can I use a custom (validated) domain?
Yes! After validating your domain, simply register your Trusted App's SIP endpoint using the custom domain and adjust `AAD_Domain` in the `Web.config` files to match the validated domain as necessary.

#### 5. Troubleshooting trusted endpoint registration
In the event you experience trusted app registration failures or errors, verify if your app is partially registered:
```
Get-CsOnlineApplicationEndpoint -Uri "sip:telehealthApp@yourtenant.onmicrosoft.com"
```

If registration details are returned, try resetting the SIP registration:
```
Set-CsOnlineApplicationEndpoint -Uri "sip:telehealthApp@yourtenant.onmicrosoft.com"
```

To entirely your wipe registration and start fresh, run:
```
Remove-CsOnlineApplicationEndpoint -Uri "sip:telehealthApp@yourtenant.onmicrosoft.com"
```

#### The web portal is not working. What do I do?
There are many reasosn for this, but typically an unresponsive web page is due to misconfiguration of the AAD application(s).
1. Verify that implicit flow has been enabled for your web portal application.
2. Verify that the appropriate redirect URIs are configured.

If you need to troubleshoot further, open your browser's inspector or developer tools and open the Console tab, then refresh the page. Use the Network tab to inspect the request/response of the requests made to Microsft services (e.g. login.microsoftonline.com and *.lync.com). Typically, the response headers or body on one of the requests will indicate the root cause for failure.

## Roadmap & Development
### Questions, issues and feedback
Please open an issue if you discover a bug or have feedback for us. Questions can be directed to [9269db0d.microsoft.com@amer.teams.ms](mailto:9269db0d.microsoft.com@amer.teams.ms).

### Upcoming features
Features that are planned or in development are submitted to the issue queue and tagged with the release version.

### Contributing
Please view our [guidance for contributors](CONTRIBUTORS.md) if you'd like to contribute to the project.

## Intended use
Please note that the code provided in this repository is intended as a code sample for kickstarting development, and that you may need to customize and test the code for your intended use case. It is developed by a the maintainers on a best-effort basis, does not constitute a product officially supported by Microsoft nor bound to an SLA. If you intend to leverage these code samples, it is your responsibility to deploy them in a manner consistent with the availability and uptime requirements of your project.
