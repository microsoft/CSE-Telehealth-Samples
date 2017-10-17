// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

var participantState;
var joined = false;
var emailAddress;
var conversation;
var xHistory = $('#message-history');

function JoinConference(meetingUri) {
    console.log("Starting meeting join sequence...");
    appInsights.trackEvent("Meeting join", { uri: meetingUri });
    appInsights.trackTrace("Starting conference join for " + meetingUri, { severity: "info", authenticated: config.isAuthenticated});

    var initCallback = config.conversationControl ? InitializeSkypeCC : InitializeSkype;
    initCallback(config.serviceUrl).then(function (skypeClient) {
        window.skypeWebApp = skypeClient;

        // Setup meeting join once we've signed in
        window.skypeWebApp.signInManager.state.changed(function (state) {
            console.log("Sign-In state changed to: ", state);
            appInsights.trackEvent("Skype sign-in state changed", { state: state })
            if (state == "SignedIn") {
                SubscribeToEvents();
                var conversationPromise = JoinConferenceCall(meetingUri);
                conversationPromise.then(StageCleanupActions)
                conversationPromise.then(ListAvailableDevices);
                conversationPromise.then(startConversationChat);
            }
        });

        if (config.isAuthenticated) {
            return GetAuthenticatedSignInOptions();
        }
        else {
            return GetAnonymousSignInTokens(config.meetingJoinUrl).then(GetAnonymousSignInOptions);
        }

    }).then(SignInToSkype);
}

function StageCleanupActions(conversation) {
    console.log('Staging cleanup actions...');
    $(window).on("beforeunload", function () {
        appInsights.trackEvent("Browser beforeunload", { participant: conversation.selfParticipant.person.id() });
        console.log("Browser beforeunload");
        if (conversation.state() != 'Disconnected') {
            HangUpCall(conversation.uri());
            updateMeetingEndTime();
        }
    });
}

// Returns a promise to the conversation
function JoinConferenceCall(uri) {
    console.log("Joining " + uri);
    conversation = window.skypeWebApp.conversationsManager.getConversationByUri(uri);
    window.conversation = conversation;

    if (config.conversationControl) {
        var container = document.getElementById("skype-cc");
        var div = document.createElement("div");
        container.appendChild(div);

        options = {};
        options.modalities = ['Chat'];
        options.conversationId = conversation.uri();

        var promise = window.skypeWebAppCtor.renderConversation(div, options);
        promise.then(function () {
            $("#loadingImage").hide();
            $("#skype-cc").width(600).height(600);
        });
        return promise;
    }
    else {
        $("#loadingImage").hide();
        $("#displayAllElements").show();
        window.skypeWebApp.conversationsManager.conversations.added(meetingConversationAdded);
        return new Promise(function (resolve, reject) { resolve(conversation); })
    }
}

function startConversationChat(conversation) {
    conversation.chatService.start().then(function () {
        console.log('chat service started');
    });
    conversation.historyService.activityItems.added(function (message) {
        if (message.type() != "TextMessage") {
            return;
        }
        console.log("history service text message: " + message);
        if (message != null) {
            if (message.text() != null) {
                openChatWindow(config.meetingId);
            }
            historyAppend(config.meetingId, XMessage(message));
        }
    });
}

function startConversationAV(conversation) {
    var videoPromise = conversation.videoService.start().then(function () {
        console.log("Video service started");
        appInsights.trackEvent("Skype video started");
    }, function (err) {
        appInsights.trackException(err);
        console.error("Error starting video service: ", err);
    });
    return videoPromise;
}


// Callback from Skype Web SDK for when a new conversation has been added.
function meetingConversationAdded(conversation) {
    console.log("Conversation added!");
    var meetingUri = conversation.uri();

    // Handle conversation disconnections by removing them from memory.
    conversation.state.once("Disconnected", function () {
        console.log("Conversation disconnected. Removing it.");
        $('#loadingText').html("Doctor left the conference");
        hangUp();
    });

    var wasConnected = false;
    conversation.selfParticipant.state.changed(function (state) {
        console.log("self participant state: " + state);
        if (state == "InLobby") {
            appInsights.trackEvent("Skype self-participant conversation state changed", { state: state, participant: conversation.selfParticipant.person.id() });
            wasConnected = true;
            $('#signInStatus').html("In Lobby");
            $('#landingContent').show();
            $('#landingContent').css('height', $(window).height());
            $('#PatientQuestionnaire').css('height', $(window).height() - 70);
            $('#loadingText1').html("We will start your virtual visit soon. Please wait for a health care professional.");
        }
        if (state == 'Connected') {
            startConversationAV(conversation);
            wasConnected = true;
            $('#landingContent').hide();
            $('#allVideoControls').show();

            $('#signInStatus').html("Connected");
            if (conversation.participantsCount() == 0) {
                $('#loadingText').html("Please wait for the doctor to join the meeting.");
            }
            else {
                $('#loadingText').html("The meeting has started. Use the buttons at the bottom to share your video or see video of other participants.");
            }
        }
        else if (state == 'Disconnected' && wasConnected) {
            $('#loadingText').html('The call has been disconnected. Please refresh the page if you need to reconnect.').show();
            $('#allVideoControls').show();
        }
    });

    conversation.selfParticipant.video.state.changed(function (newState) {
        console.log("self participant video state: " + newState);
        appInsights.trackEvent("Skype self-participant video state changed", { state:newState });
        if (newState == 'Notified') {
            $('#signInStatus').html("Notified");
            conversation.videoService.accept();
        }
        if (newState == 'Connected') {
            $('#signInStatus').html("Connected");
            joined = true;
            if (conversation.participantsCount() == 0) {
                $('#loadingText').html("Please wait for the doctor to join the meeting.");
            }
            StartMyVideo();
        }
        if (newState == 'Disconnected') {
            $('#signInStatus').html("Disconnected");
        }
    });

    conversation.participants.added(function (skypeParticipant) {
        console.log("Participant " + skypeParticipant.displayName() + " added");
        skypeParticipant.state.changed(function (state) {
            console.log("participant " + skypeParticipant.displayName() + " state: " + state);
            appInsights.trackEvent("Skype participant state changed", { state: state, participant: skypeParticipant.person.id() });
            if (state == 'InLobby') {
                // TODO: You may want to take special actions here
            }
            if (state == 'Connected') {
                joined = true;
                $('#loadingText').html("The meeting has started. Use the buttons at the bottom to share your video or see video of other participants.");
            }
            if (state == 'Disconnected' && conversation.participantsCount() == 0) {
                if (joined) {
                    $('#loadingText').html("Doctor left the conference");
                }
            }
        });

        skypeParticipant.video.state.changed(onVideoStateChanged);

        function onVideoStateChanged(newState) {
            var channel = skypeParticipant.video.channels(0);
            console.log("participant video state changed for " + skypeParticipant.name() + ": " + newState);
            if (newState == 'Connected') {
                if (conversation.isGroupConversation()) {
                    // subscribe to isVideoOn changes
                    channel.isVideoOn.changed(onIsVideoOnChanged);
                }
            }
        }

        function onIsVideoOnChanged(val) {
            var channel = skypeParticipant.video.channels(0);
            var container = channel.stream.source.sink.container;
            if (val) {
                $('#videoWindow').show();
                // subscribe to remote video
                if (conversation.isGroupConversation() && !channel.isStarted()) {
                    var renderWindow = document.getElementById("video0");
                    renderWindow.innerHTML = '';
                    if (!container()) {
                        // if container is not set, set it and then call
                        // isStarted after that promise returns
                        container.set(renderWindow).then(function () {
                            channel.isStarted(true);
                        });
                    } else {
                        channel.isStarted(true);
                    }
                }
            } else {
                if (conversation.isGroupConversation() && channel.isStarted() && channel.isStarted.set.enabled()) {
                    // unsubscribe to remote video
                    channel.isStarted(false);
                    $('#videoWindow').hide();
                }
            }
        }
    });
}

function openChatWindow() {
    appInsights.trackEvent("Skype chat opened");
    register_popup('', config.meetingId, conversation.selfParticipant.person.displayName());
}

// TODO this might get called multiple times if they close/open the chat window repeatedly
function StartIMConversation(meetingUri) {
    console.log('Starting IM conversation for meeting ' + meetingUri);
    var chatConversation = window.skypeWebApp.conversationsManager.getConversationByUri(meetingUri);
    var id = conversation.selfParticipant.person.id();
    id = id.substring(id.indexOf('sip:') + 4, id.indexOf("@"));
    chatConversation.chatService.start().then(function () {
        console.log("conversation started.");
    });
}

function SendIMMessages(participantEmail, id) {
    var chatConversation = window.skypeWebApp.conversationsManager.getConversation("sip:" + participantEmail);
    if (chatConversation.state._value == "Created") {
        selfParticipantEmail = emailAddress;
        StartChatConversation(participantEmail, selfParticipantEmail, id);
    }
    var textmessage = $('#message_' + id).val();
    var chatConversation = window.skypeWebApp.conversationsManager.getConversation("sip:" + participantEmail);

    chatService.sendMessage(textmessage);
    $('#message_' + id).val("");
}

function sendMessage(meetingUri, id) {
    var chatConversation = window.skypeWebApp.conversationsManager.getConversationByUri(meetingUri);
    if (chatConversation.state._value == "Created") {
        StartIMConversation(meetingUri);
    }
    var message = $('#message_' + id).val();
    if (message) {
        var chatConversation = window.skypeWebApp.conversationsManager.getConversation(meetingUri);
        conversation.chatService.sendMessage(message).catch(function () {
            console.log('Cannot send the message');
        });
    }
    $('#message_' + id).val("");
}
function StopConversation(meetingUri) {
    var chatConversation = window.skypeWebApp.conversationsManager.getConversationByUri(meetingUri);
    if (chatConversation) {
        LeaveConversationIfChatOnly(chatConversation);
    }
}
function StopMultipleConversations(participantEmail) {
    var chatConversation = window.skypeWebApp.conversationsManager.getConversation("sip:" + participantEmail);
    if (chatConversation) {
        LeaveConversationIfChatOnly(chatConversation);
    }
}

function LeaveConversationIfChatOnly(conversation) {
    if (conversation.videoService.state == "Disconnected" && conversation.audioService.state == "Disconnected") {
        conversation.leave();
    }
}

function historyAppend(id, message) {
    var historyElement = "";
    if (id == '') {
        historyElement = $('#message-history');
    }
    else {
        historyElement = $('#message-history_'+id);
    }
    historyElement.append(message);
    historyElement.animate({ "scrollBottom": historyElement[0].scrollHeight }, 'fast');
}

function XMessage(message) {
    var xTitle = $('<div>').addClass('sender');
    var xStatus = $('<div>').addClass('status');
    var xText = $('<div>').addClass('text').text(message.text());
    var xMessage = $('<div>').addClass('message');
    xMessage.append(xTitle, xStatus, xText);
    if (message.sender) {
        message.sender.displayName.get().then(function (displayName) {
            if (message.sender.id() != window.skypeWebApp.personsAndGroupsManager.mePerson.id()) {
                xTitle.text(displayName);
            }
        });
    }
    message.status.changed(function (status) {
        //xStatus.text(status);
    });
    if (message.sender.id() == window.skypeWebApp.personsAndGroupsManager.mePerson.id())
        xMessage.addClass("fromMe");
    return xMessage;
}

function UpdateSelectedCamera() {
    try {
        var selectedCamera = window.skypeWebApp.devicesManager.selectedCamera().id();
        $('#cameras option[value=' + selectedCamera + ']').attr('selected', 'selected');
        $('#btn-start-video').show();
    } catch (ex) {
        console.log('No camera device is available; disabling self participant video.');
        $('#btn-start-video').hide();
    }
}

function UpdateSelectedMic() {
    try {
        var selectedMicrophone = window.skypeWebApp.devicesManager.selectedMicrophone().id();
        $('#mics option[value=' + selectedMicrophone + ']').attr('selected', 'selected');
    } catch (ex) {
        console.log('No audio capture device is available.');
    }
}

function ListAvailableDevices() {
    window.skypeWebApp.devicesManager.cameras.added(function (newCamera) {
        console.log('Camera added');
        $('#cameras').append($("<option></option>").attr("value", newCamera.id()).text(newCamera.name()));
        UpdateSelectedCamera();
    });

    window.skypeWebApp.devicesManager.microphones.added(function (newMicrophone) {
        $('#mics').append($("<option></option>").attr("value", newMicrophone.id()).text(newMicrophone.name()));
        UpdateSelectedMic();
    });

    window.skypeWebApp.devicesManager.speakers.added(function (newSpeaker) {
        $('#speakers').append($("<option></option>").attr("value", newSpeaker.id()).text(newSpeaker.name()));
    });

    var selectedSpeaker = window.skypeWebApp.devicesManager.selectedSpeaker().id();
    $('#speakers option[value=' + selectedSpeaker + ']').attr('selected', 'selected');
}

function SubscribeToEvents() {
    window.skypeWebApp.devicesManager.cameras.subscribe();
    window.skypeWebApp.devicesManager.microphones.subscribe();
    window.skypeWebApp.devicesManager.speakers.subscribe();
}
function ChangeDevices(meetingUri) {
    var stopAudio;
    var changedMicrophone = null, changedSpeaker = null;
    var chosenCameraId = $('#cameras').val();
    var chosenMicId = $('#mics').val();
    var chosenSpeakerId = $('#speakers').val();
    window.skypeWebApp.devicesManager.cameras.get().then(function (list) {
        console.log("get Camera");
        for (var i = 0; i < list.length; i++) {
            var camera = list[i];
            if (camera.id() == chosenCameraId) {
                window.skypeWebApp.devicesManager.selectedCamera.set(camera);
            }
        }
    });

    window.skypeWebApp.devicesManager.microphones.get().then(function (list) {
        console.log("get Mic");
        for (var i = 0; i < list.length; i++) {
            var microphone = list[i];
            if (microphone.id() == chosenMicId) {
                changedMicrophone = microphone;
                stopAduio = true;
                window.skypeWebApp.devicesManager.selectedMicrophone.set(microphone);
            }
        }
    });

    window.skypeWebApp.devicesManager.speakers.get().then(function (list) {
        console.log("get Speaker");
        for (var i = 0; i < list.length; i++) {
            var speaker = list[i];
            if (speaker.id() == chosenSpeakerId) {
                changedSpeaker = speaker;
                stopAudio = true;
                window.skypeWebApp.devicesManager.selectedSpeaker.set(speaker);
            }
        }
    });
    window.skypeWebApp.devicesManager.selectedMicrophone.changed(function (device) {
        console.log("mic changed");
        appInsights.trackEvent("Skype device changed", { type: "microphone" });
        if (stopAudio) {
            var conv = window.skypeWebApp.conversationsManager.getConversationByUri(meetingUri);
            if (conv != null) {
                conv.audioService.stop().then(function () {
                    console.log("audio service stopped and again starting.");
                    conv.audioService.start().then(function () {
                        console.log("audio service started again.");
                        stopAudio = false;
                    });
                });
            }
        }
    });
    window.skypeWebApp.devicesManager.selectedSpeaker.changed(function (device) {
        console.log("speaker changed");
        appInsights.trackEvent("Skype device changed", { type: "speaker" });
        if (stopAudio) {
            var conv = window.skypeWebApp.conversationsManager.getConversationByUri(meetingUri);
            if (conv != null) {
                conv.audioService.stop().then(function () {
                    console.log("audio service stopped and again starting.");
                    conv.audioService.start().then(function () {
                        console.log("audio service started again.");
                        stopAudio = false;
                    });
                });
            }
        }
    });

    window.skypeWebApp.devicesManager.selectedCamera.changed(function (device) {
        console.log("camera changed");
        appInsights.trackEvent("Skype device changed", { type: "camera" });
    });
}

function MuteAndUnMute(uri) {
    var conv, audio;
    conv = window.skypeWebApp.conversationsManager.getConversationByUri(uri);
    if (conv) {
        audio = conv.selfParticipant.audio;
        if (audio.isMuted()) {
            appInsights.trackEvent("Skype self-participant audio unmuted");
            $("#btn-unmute").hide();
            $("#btn-mute").show();
        }
        else {
            appInsights.trackEvent("Skype self-participant audio muted");
            $("#btn-unmute").show();
            $("#btn-mute").hide();
        }
        audio.isMuted.set(!audio.isMuted());
    }
};

function StartMyVideo(uri) {
    var container = document.getElementById("myVideo");
    container.innerHTML = '';

    console.log('Start my video on ' + conversation.uri());
    var selfChannel = conversation.selfParticipant.video.channels(0);
    selfChannel.stream.source.sink.container.set(container);
    conversation.selfParticipant.video.channels(0).isStarted.set(true);
    ShowMyVideo();
};

function StopMyVideo(uri) {
    conversation.selfParticipant.video.channels(0).isStarted.set(false);
    HideMyVideo();
};

function signOut() {
    window.skypeWebApp.signInManager.signOut().then(function () {
        console.log("Signed out.");
    }, function (err) {
        console.error("Error signing out: " + err);
    });
};
function ShowMyVideo() {
    $("#btn-start-video").hide();
    $("#btn-stop-video").show();
    $('#myVideo').show();
    $('#myVideo').css('display', 'inline-block');
}

function HideMyVideo() {
    $("#btn-start-video").show();
    $("#btn-stop-video").hide();
    $('#myVideo').hide();
}
