// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

function StageCleanupActions(conversation) {
    console.log('Staging cleanup actions...');
    $(window).on("beforeunload", function () {
        appInsights.trackEvent("Browser beforeunload", { participant: conversation.selfParticipant.person.id() });
        console.log("Browser beforeunload");
        if (conversation.state() != 'Disconnected') {
            HangUpCall(conversation.uri());
        }
    });
}

$(document).ready(function () {
    InitializeSkypeCC(config.serviceUrl).then(function (skypeClient) {
        window.skypeWebApp = skypeClient;
        var options = GetAuthenticatedSignInOptions();
        SignInToSkype(options).then(function () {
            var container = document.getElementById("skype-cc");
            var div = document.createElement("div");
            container.appendChild(div);

            options = {};
            options.modalities = ['Chat'];
            options.conversationId = config.meetingConferenceUri;

            var promise = window.skypeWebAppCtor.renderConversation(div, options);
            promise.then(function () {
                $("#skype-cc").width(600).height(600);
            });
            promise.then(StageCleanupActions);

            var conversation = window.skypeWebApp.conversationsManager.getConversationByUri(options.conversationId);
            window.conversation = conversation;
            conversation.participants.added(function (participant) {
                participant.state.changed(function (newState) {
                    var ul = $("#admit");
                    if (newState == 'InLobby') {
                        var li = $('<li></li>');
                        participant.person.id.changed(function (id) { li.attr('data-participantId', id); });

                        var link = $('<a href="#"></a>');
                        participant.person.displayName.changed(function (name) { link.text(name); });
                        link.click(function () { participant.admit(); });
                        li.append(link);

                        ul.append(li);
                    }
                    else {
                        $("li[data-participantId='" + participant.person.id() + "']", ul).remove();
                    }
                });
            });
        });
    });
});