// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

var config = {
    apiKey: 'a42fcebd-5b43-4b89-a065-74450fb91255', // SDK
    apiKeyCC: '9c967f6b-a846-4df2-b43d-5167e47d81e1', // SDK+CC DF
    version: "CSE Telehealth Samples/1.0.0",
};

function ParseInlineConfiguration() {
    config.WebPortalBaseUrl = $('#config').attr('data-webPortalBaseUrl');
    config.ApiBaseUrl = $('#config').attr('data-apiBaseUrl');
    config.meetingId = $('#config').attr('data-meetingId');
    config.meetingConferenceUri = $('#config').attr('data-meetingConferenceUri');
    config.meetingJoinUrl = $('#config').attr('data-meetingJoinUrl');
    config.clientId = $('#config').attr('data-clientId');
    config.serviceUrl = $('#config').attr('data-skypeServiceUrl');
    config.conversationControl = $('#config').attr('data-skypeUseConversationControl') == "true";
    config.isAuthenticated = $('#config').attr('data-isAuthenticated') == "true";

    var config_telemetry = Object.create(config);
    config_telemetry.severity = "verbose";
    appInsights.trackTrace("Parsed configuration", config_telemetry);
}
ParseInlineConfiguration();

function InitializeSkype(serviceUrl) {
    console.log('Initializing Skype...');
    var skypeInit = new Promise(function (resolve, reject) {
        Skype.initialize({ apiKey: config.apiKey }, function (api) {
            console.log("SDK loaded.");
            appInsights.trackTrace("SDK loaded", { severity: "verbose" });
            window.skypeWebAppCtor = api.application;
            var client = new api.application();
            client.allowedOrigins = window.location.href;
            client.serviceUrl = serviceUrl;
            resolve(client);
        }, function(err) {
            appInsights.trackException(err.message);
            reject(err);
        });
    });
    return skypeInit;
}

function InitializeSkypeCC(serviceUrl) {
    console.log('Initializing Skype (CC)...');
    var skypeInit = new Promise(function (resolve, reject) {
        Skype.initialize({ apiKey: config.apiKeyCC }, function (api) {
            console.log("SDK (+CC) loaded.");
            appInsights.trackTrace("SDK (+CC) loaded", { severity: "verbose" });
            window.skypeWebAppCtor = api;
            var client = api.UIApplicationInstance;
            client.allowedOrigins = window.location.href;
            client.serviceUrl = serviceUrl;
            resolve(client);
        }, function(err) {
            appInsights.trackException(err.message);
            reject(err);
        });
    });
    return skypeInit;
}

function SignInToSkype(options) {
    console.log("Attempting sign-in to Skype for Business");
    return window.skypeWebApp.signInManager.signIn(options).then(function () {
        console.log("Successfully signed in as " + window.skypeWebApp.personsAndGroupsManager.mePerson.displayName());
        appInsights.trackTrace("Skype for Business sign-in successful", { severity: "verbose" });
    }, function (err) {
        console.error("Could not sign in to Skype for Business - " + err.code + ": " + err.error_description);
        // .message for OAuth-related errors currently is too generic, so trace the additional properties on the error as well.
        // This should be fixed in a upcoming SDK release.
        appInsights.trackTrace("Skype for Business sign-in failed", Object.assign({ severity: "error", module: 'skype_common' }, err));
        appInsights.trackException(err, "SignInToSkype");
    });
}

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

function guid() {
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

function GetAnonymousSignInTokens(meetingUri) {
    console.log('Getting anonymous sign-in tokens');
    var anonAppInput = {
        ApplicationSessionId: "AnonMeeting-" + S4() + '-' + S4(),
        AllowedOrigins: window.skypeWebApp.allowedOrigins,
        MeetingUrl: meetingUri
    };

    var jqPromise = $.ajax({
        url: window.skypeWebApp.serviceUrl + '/GetAnonTokenJob',
        type: 'post',
        async: true,
        dataType: 'text',
        data: anonAppInput,
        error: function (err) {
            console.log('Error getting anonymous tokens:', err);
        }
    });
    return jqPromise;
}

function GetAnonymousSignInOptions(anonTokenJSON) {
    var anonMeetingOptions = {};
    var data = JSON.parse(anonTokenJSON);
    if (data) {
        var tokenRaw = data.Token;
        var user = data.DiscoverUri;

        anonMeetingOptions = {
            name: 'AnonUser-' + S4() + '-' + S4(),
            cors: true,
            root: { user: user },
            auth: function (req, send) {
                // the GET /discover must be sent without the token
                if (req.url != user)
                    req.headers['Authorization'] = "Bearer " + tokenRaw;

                return send(req);
            }
        };
        joinconf = true;
    }
    return anonMeetingOptions;
}

function GetAuthenticatedSignInOptions() {
    var options = {
        "client_id": config.clientId,
        "origins": ["https://webdir.online.lync.com/autodiscover/autodiscoverservice.svc/root"],
        "cors": true,
        "version": config.version,
        redirect_uri: location.origin + "/Content/token.html", // ensure location.origin is in your Reply URLs in Azure
    }
    return options;
}

function HangUpCall(uri) {
    var conversation = window.skypeWebApp.conversationsManager.getConversationByUri(uri);
    if (conversation) {
        appInsights.trackEvent("Meeting end", { uri: uri });
        if (conversation.selfParticipant.video.state() == "Connected") {
            conversation.selfParticipant.video.channels(0).stream.source.sink.container.set(null);
            conversation.selfParticipant.video.channels(0).isStarted.set(false);
        }
        conversation.audioService.stop();
        conversation.videoService.stop();
        conversation.leave();
        console.log("call ended for " + uri);
    }
};