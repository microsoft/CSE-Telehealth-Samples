// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

using Microsoft.AspNet.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace CSETHSamples_WebPortal
{
    [Authorize]
    public class URIPassthroughHub : Hub
    {
        public override Task OnConnected()
        {
            return Clients.Caller.hubReceived("Welcome " + Context.User.Identity.Name + "!");
        }


        public void Echo(string value)
        {
            Clients.Caller.hubReceived(value);
        }

        public void SendURI(string uri)
        {
            Clients.User(Context.User.Identity.Name).HandleURI(uri);
        }
    }
}