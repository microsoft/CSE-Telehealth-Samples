// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.AspNet.SignalR.Client;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using System;
using System.Configuration;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.Net.Http;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace CSETHSamples_TrayListener
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private static string aadAuthority = ConfigurationManager.AppSettings["AAD_AuthorityUri"];
        private static string aadDomain = ConfigurationManager.AppSettings["AAD_Domain"];
        private static string authorityUri = String.Format(CultureInfo.InvariantCulture, aadAuthority, aadDomain);
        private static string aadClientId = ConfigurationManager.AppSettings["AAD_ClientId"];
        private static string graphResourceId = "https://graph.windows.net";
        private static string webPortalBaseUrl = ConfigurationManager.AppSettings["WebPortalBaseUrl"];

        private Uri redirectUri = new Uri(ConfigurationManager.AppSettings["AAD_RedirectUri"]);
        private AuthenticationContext authContext = null;

        private System.Windows.Forms.NotifyIcon notifyIcon = null;
        private System.Windows.Forms.ContextMenu contextMenu = null;
        private System.Windows.Forms.MenuItem signInMenuItem = null;
        private System.Windows.Forms.MenuItem signOutMenuItem = null;
        private HubConnection hubConnection = null;
        private bool tryingToReconnect = false;
        private int reconnectDelay = 1; // seconds
        private int reconnectDelayRemaining = 0; // seconds
        private int reconnectDelayTimeout = 300; // seconds

        public MainWindow()
        {
            InitializeComponent();
            this.WindowState = WindowState.Minimized;
            this.authContext = new AuthenticationContext(authorityUri, new FileCache());

            InitializeContextMenu();
            InitializeNotifyIcon();
            if (IsAuthenticated())
            {
                InitializeSignalR();
            }
            else
            {
                SignIn();
            }
        }

        #region ContextMenu
        private void InitializeContextMenu()
        {
            contextMenu = new System.Windows.Forms.ContextMenu();

            signInMenuItem = new System.Windows.Forms.MenuItem();
            signInMenuItem.Index = 0;
            signInMenuItem.Text = "Sign &In";
            signInMenuItem.Click += Menu_SignIn;
            signInMenuItem.Visible = !IsAuthenticated();
            contextMenu.MenuItems.Add(signInMenuItem);

            signOutMenuItem = new System.Windows.Forms.MenuItem();
            signOutMenuItem.Index = 1;
            signOutMenuItem.Text = "Sign &Out";
            signOutMenuItem.Click += Menu_SignOut;
            signOutMenuItem.Visible = IsAuthenticated();
            contextMenu.MenuItems.Add(signOutMenuItem);

            var exitMenuItem = new System.Windows.Forms.MenuItem();
            exitMenuItem.Index = 2;
            exitMenuItem.Text = "E&xit";
            exitMenuItem.Click += Menu_Exit;
            contextMenu.MenuItems.Add(exitMenuItem);
        }

        protected void Menu_Exit(object sender, EventArgs e)
        {
            Exit();
        }

        protected void Menu_SignIn(object sender, EventArgs e)
        {
            SignIn();
        }
        protected void Menu_SignOut(object sender, EventArgs e)
        {
            SignOut();
            MessageBox.Show("Signed out successfully.");
        }
        #endregion ContextMenu

        #region TrayIcon
        private void InitializeNotifyIcon()
        {
            notifyIcon = new System.Windows.Forms.NotifyIcon();
            SetNotifyIcon("red.ico");
            notifyIcon.Click += notifyIcon_Click;
            notifyIcon.Visible = true;
            notifyIcon.ContextMenu = contextMenu;
        }

        private void SetNotifyIcon(string filename)
        {
            using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("CSETHSamples_TrayListener.Resources." + filename))
            {
                notifyIcon.Icon = new Icon(stream);
            }
        }

        private void notifyIcon_Click(object Sender, EventArgs e)
        {
            if (this.WindowState == WindowState.Minimized)
            {
                this.WindowState = WindowState.Normal;
            }
        }
        #endregion

        #region SignalR
        private async void InitializeSignalR()
        {
            AuthenticationResult result = await GetAuthenticationToken();
            hubConnection = new HubConnection(webPortalBaseUrl);
            hubConnection.Reconnected += HubConnection_Reconnected;
            hubConnection.StateChanged += HubConnection_StateChanged;
            hubConnection.Headers.Add("Authorization", String.Format("Bearer {0}", result.AccessToken));

            // Enable me for debug
            //hubConnection.TraceWriter = Console.Out;
            //hubConnection.TraceLevel = TraceLevels.All;

            IHubProxy URIPassthroughHubProxy = hubConnection.CreateHubProxy("URIPassthroughHub");
            URIPassthroughHubProxy.On<string>("HandleURI", url =>
            {
                if (url.StartsWith("conf"))
                {
                    Process.Start(url);
                }
            });

            SignalRConnect();
        }

        private void HubConnection_Reconnected()
        {
            tryingToReconnect = false;
            MessageBox.Show("Your SignalR connection has been restored, launching meetings will function normally again.", "Restored connection", MessageBoxButton.OK, MessageBoxImage.Warning, MessageBoxResult.OK, MessageBoxOptions.DefaultDesktopOnly);
        }

        private void HubConnection_StateChanged(StateChange obj)
        {
            this.Dispatcher.Invoke(() =>
            {
                switch (obj.NewState)
                {
                    case ConnectionState.Reconnecting:
                        SetNotifyIcon("orange.ico");
                        tryingToReconnect = true;
                        MessageBox.Show("Your SignalR connection has failed; launching meetings will not function until the connection is restored. The application will try to reconnect automatically.", "Lost connection", MessageBoxButton.OK, MessageBoxImage.Warning, MessageBoxResult.OK, MessageBoxOptions.DefaultDesktopOnly);
                        UpdateSignalRUIStatus("Reconnecting...");
                        break;
                    case ConnectionState.Connected:
                        SetNotifyIcon("green.ico");
                        UpdateSignalRUIStatus("Connected, listening");
                        tryingToReconnect = false;
                        break;
                    case ConnectionState.Connecting:
                        SetNotifyIcon("orange.ico");
                        UpdateSignalRUIStatus("Connecting...");
                        break;
                    case ConnectionState.Disconnected:
                        SetNotifyIcon("red.ico");
                        UpdateSignalRUIStatus("Disconnected");
                        if (!tryingToReconnect && reconnectDelay > reconnectDelayTimeout)
                        {
                            MessageBox.Show("Could not reconnect. Please verify your network connectivity and restart the application.", "Lost connection", MessageBoxButton.OK, MessageBoxImage.Warning, MessageBoxResult.OK, MessageBoxOptions.DefaultDesktopOnly);
                        }
                        else
                        {
                            reconnectDelay = reconnectDelay * 2;
                            reconnectDelayRemaining = reconnectDelay;
                            QueueSignalRReconnect();
                        }
                        break;
                }
            });
        }

        private async void SignalRConnect()
        {
            try
            {
                await hubConnection.Start();
            }
            catch (HttpRequestException ex)
            {
                return;
            }
        }

        private void QueueSignalRReconnect()
        {
            DispatcherTimer secondCounter = new DispatcherTimer();
            secondCounter.Interval = new TimeSpan(0, 0, 1);
            secondCounter.Tick += QueueSignalRReconnectTick;
            secondCounter.Start();
        }

        private void QueueSignalRReconnectTick(object sender, EventArgs e)
        {
            reconnectDelayRemaining -= 1;
            if (reconnectDelayRemaining > 0)
            {
                UpdateSignalRUIStatus(string.Format("Disconnected (will attempt reconnection in {0}s)", reconnectDelayRemaining));
            }
            else
            {
                DispatcherTimer secondCounter = (DispatcherTimer)sender;
                secondCounter.Stop();
                SignalRConnect();
            }
            
        }
        #endregion

        #region Helpers
        private bool IsAuthenticated()
        {
            return authContext.TokenCache.Count > 0;
        }

        private void UpdateSignInUIState(UserInfo userInfo = null)
        {
            bool authenticated = IsAuthenticated();
            SignInButton.Visibility = authenticated ? Visibility.Collapsed : Visibility.Visible;
            SignOutButton.Visibility = !authenticated ? Visibility.Collapsed : Visibility.Visible;
            signInMenuItem.Visible = !authenticated;
            signOutMenuItem.Visible = authenticated;
            AuthenticationStatus.Text = authenticated ? "Signed in" : "Signed out";
            Username.Text = userInfo == null ? "N/A" : userInfo.DisplayableId;
        }

        private void UpdateSignalRUIStatus(string status)
        {
            notifyIcon.Text = status;
            SignalRStatus.Text = status;
        }

        public async Task<AuthenticationResult> GetAuthenticationToken()
        {
            //
            // Get an access token to call the To Do service.
            //
            AuthenticationResult result = null;
            try
            {
                result = await authContext.AcquireTokenAsync(graphResourceId, aadClientId, redirectUri, new PlatformParameters(PromptBehavior.Never));
                UpdateSignInUIState(result.UserInfo);
            }
            catch (AdalException ex)
            {
                // There is no access token in the cache, so prompt the user to sign-in.
                if (ex.ErrorCode == "user_interaction_required")
                {
                    SignIn();
                }
                else
                {
                    // An unexpected error occurred.
                    string message = ex.Message;
                    if (ex.InnerException != null)
                    {
                        message += "Error Code: " + ex.ErrorCode + "Inner Exception : " + ex.InnerException.Message;
                    }
                    MessageBox.Show(message);
                }

                return null;
            }
            return result;
        }

        // This function clears cookies from the browser control used by ADAL.
        private void ClearCookies()
        {
            const int INTERNET_OPTION_END_BROWSER_SESSION = 42;
            InternetSetOption(IntPtr.Zero, INTERNET_OPTION_END_BROWSER_SESSION, IntPtr.Zero, 0);
        }
        [DllImport("wininet.dll", SetLastError = true)]
        private static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int lpdwBufferLength);
        #endregion

        #region ApplicationActions
        protected void Exit(object sender = null, RoutedEventArgs args = null)
        {
            notifyIcon.Visible = false;
            Application.Current.Shutdown();
        }

        private void SignOut(object sender = null, RoutedEventArgs args = null)
        {
            // If there is already a token in the cache, clear the cache and update the label on the button.
            authContext.TokenCache.Clear();

            // Also clear cookies from the browser control.
            ClearCookies();

            // Disconnect from SignalR
            if (hubConnection != null)
            {
                hubConnection.Stop();
            }

            UpdateSignInUIState();
        }

        private async void SignIn(object sender = null, RoutedEventArgs args = null)
        {
            if (IsAuthenticated())
            {
                SignOut();
            }

            // Get an access token to call the To Do list service.
            AuthenticationResult result = null;
            try
            {
                result = await authContext.AcquireTokenAsync(graphResourceId, aadClientId, redirectUri, new PlatformParameters(PromptBehavior.Always));
                UpdateSignInUIState(result.UserInfo);
                try
                {
                    InitializeSignalR();
                }
                catch (Exception ex)
                {
                    // Note: 500 error often indicates authentication issues (was redirected to a 401 response or MS authentication page, which cannot be parsed)
                    string message = "Could not initialize SignalR listener, please restart the application and try again.If the issue persists, contact your system administrator.";
                    message += "\nException: " + ex.Message;
                    if (ex.InnerException != null) message += "\nInner Exception : " + ex.InnerException.Message;
                    MessageBox.Show(message);
                }
            }
            catch (AdalException ex)
            {
                if (ex.ErrorCode == "authentication_canceled")
                {
                    // The user canceled sign in
                    UpdateSignInUIState();
                }
                else
                {
                    string message = "An unexpected error occured.";
                    message += "\n Exception: " + ex.Message;
                    if (ex.InnerException != null) message += "\nInner Exception : " + ex.InnerException.Message;
                    MessageBox.Show(message);
                }

                return;
            }

        }
        #endregion
    }
}
