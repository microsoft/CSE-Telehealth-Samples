using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(CSETHSamples_WebPortal.Startup))]
namespace CSETHSamples_WebPortal
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);

            // You may want to consider hosting multiple load-balanced instances of this web service
            // with a single backplane (e.g. ServiceBus). See also:
            // https://www.asp.net/signalr/overview/performance/scaleout-with-windows-azure-service-bus

            app.MapSignalR(new HubConfiguration());
            GlobalHost.HubPipeline.RequireAuthentication();
        }
    }
}
