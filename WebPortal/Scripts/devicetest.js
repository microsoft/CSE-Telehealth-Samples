// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

var validatePeripherals = false;
var devicesCheck = false;
var pluginVerified = false;
var speedtest = {
    avgPing: 0,
    avgDownload: 0,
    avgUpload: 0,
}

function requiresPlugin() {
    return !(Skype.Web.Media.isOrtc() || Skype.Web.Media.isWebRtc());
}

function GetAdhocMeeting() {
    console.log('Getting ad-hoc meeting');
    var input = {
        Subject: "Device Test",
        Description: "Device Test"
    };

    var jqPromise = $.ajax({
        url: window.skypeWebApp.serviceUrl + '/GetAdhocMeetingJob',
        type: 'post',
        async: true,
        dataType: 'json',
        data: input,
        error: function (err) {
            console.log('Error getting ad-hoc meeting:', err);
        }
    });
    return jqPromise;
}

$(document).ready(function () {
    $("#net_check_result").html("Click 'Start' to begin the network test.");
    $("#WebCamStatus").html("Plugin is not yet verified. Go back to plugin tab...");
    $("#MicrophoneStatus").html("Plugin is not yet verified. Go back to plugin tab...");
    $("#SpeakerStatus").html("Plugin is not yet verified. Go back to plugin tab...");

    $("#btnCheckPlugin").click(function () {
        $("#PluginDetails").css("display", "block");
        if (pluginVerified == false) {
            $("#PluginStatus").html("<img src='/Content/Images/preloader.gif'>");
            
            InitializeSkype(config.serviceUrl).then(function (skypeClient) {
                window.skypeWebApp = skypeClient;
                window.skypeWebApp.signInManager.state.changed(function (state) {
                    console.log("Sign-In state changed to: ", state);
                    if (state == "SignedIn") {
                        SubscribeToDevices();

                        var result = null;
                        if (requiresPlugin()) {
                            result = checkPlugin();
                        } else {
                            result = new Promise(function (resolve, reject) {
                                pluginVerified = true;
                                document.getElementById("PluginStatus").innerHTML = "Plugin is not required.";
                                $("#PluginState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
                                $("#btnPluginOk").removeAttr("disabled");
                                resolve(pluginVerified);
                            });
                        }

                        if (result !== null) {
                            result.then(function () {
                                if (pluginVerified) {
                                    document.getElementById("WebCamStatus").innerHTML = "";
                                    document.getElementById("MicrophoneStatus").innerHTML = "";
                                    document.getElementById("SpeakerStatus").innerHTML = "";
                                    $("#WebCamShow").css("display", "block");
                                    $("#MicrophoneTab").css("display", "block");
                                    $("#SpeakerTab").css("display", "block");
                                }
                            });
                        }
                    }
                });

                if (config.isAuthenticated) {
                    return GetAuthenticatedSignInOptions();
                }
                else {
                    var joinUrl;

                    // Guest join to ad-hoc join
                    return GetAdhocMeeting().then(function (response) {
                        joinUrl = response.JoinUrl;
                        console.log("Got ad-hoc meeting details:", response);
                        return GetAnonymousSignInTokens(joinUrl).then(GetAnonymousSignInOptions);
                    });
                }
            }).then(SignInToSkype)
            .then(function () {
                window.skypeWebApp.conversationsManager.conversations.added(function (conversation) {
                    window.conversation = conversation;
                    var chatService, dfdChatAccept, audioService, dfdAudioAccept, videoService, dfdVideoAccept, selfParticipant, name, timerId;
                    selfParticipant = conversation.selfParticipant;
                    chatService = conversation.chatService;
                    audioService = conversation.audioService;
                    videoService = conversation.videoService;

                    selfParticipant.audio.state.changed(function (newState, reason, oldState) {
                        if (newState == 'Notified' && !timerId)
                            timerId = setTimeout(onAudioVideoNotified, 0);
                    });
                    selfParticipant.video.state.changed(function (newState, reason, oldState) {
                        var selfChannel;
                        if (newState == 'Notified' && !timerId) {
                            timerId = setTimeout(onAudioVideoNotified, 0);
                        }
                        else if (newState == 'Connected') {
                            console.log('video connected');
                            selfChannel = conversation.selfParticipant.video.channels(0);
                            selfChannel.stream.source.sink.container.set(document.getElementById("previewWindow"));
                            selfChannel.isStarted.set(true);
                        }
                    });
                    conversation.selfParticipant.state.changed(function (state) {
                        console.log("self participant state: " + state);
                        if (state == 'Connected') {
                            // do same as startConversationAV() but with some extra error handling for missing plugin
                            var videoPromise = conversation.videoService.start().then(function () {
                                console.log("Video service started");
                                appInsights.trackEvent("Skype video started");
                            }, function (err) {
                                appInsights.trackException(err);
                                console.error("Error starting video service: ", err);

                                document.getElementById("WebCamStatus").innerHTML = "Could not start audio/video services.<br />Please refresh this page and try again.";
                                $("#WebcamState").removeClass("question-icon").removeClass("tick-icon").addClass("cancel-icon");
                                $("#WebCamShow").hide();
                                $('#webcam .button-container').hide();

                                if (err.code == "PluginNotInstalled") {

                                }
                                else {

                                }
                            });
                        }
                    });
                    conversation.state.changed(function onDisconnect(state) {
                        if (state == 'Disconnected') {
                            conversation.state.changed.off(onDisconnect);
                            window.skypeWebApp.conversationsManager.conversations.remove(conversation);
                        }
                    });

                    // Kick things off
                    conversation.chatService.start();
                });

                if (config.isAuthenticated) {
                    // Triggers the conversation added callback
                    window.skypeWebApp.conversationsManager.getConversationByUri(config.meetingJoinUrl);
                }
            });
        }
    });

    $("#btnInternetOk").click(function () {
        $("#liInternet").removeClass("active");
        $("#internet").removeClass("active");
        $("#liPlugin").addClass("active");
        $("#plugin").addClass("active");
        $("#internetState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
    });

    $("#btnGoToInternetTab").click(function () {
        $("#liPlugin").removeClass("active");
        $("#plugin").removeClass("active");
        $("#liInternet").addClass("active");
        $("#internet").addClass("active");
    });

    $("#btnPluginOk").click(function () {
        $("#liPlugin").removeClass("active");
        $("#plugin").removeClass("active");
        $("#liWebcam").addClass("active");
        $("#webcam").addClass("active");
    })

    $("#btnWebcamError").click(function () {
        $("#WebcamState").removeClass("question-icon").removeClass("tick-icon").addClass("cancel-icon");
        $("#liWebcam").removeClass("active");
        $("#webcam").removeClass("active");
        $("#liMicrophone").addClass("active");
        $("#microphone").addClass("active");
    });

    $("#btnWebcamOk").click(function () {
        $("#WebcamState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
        $("#liWebcam").removeClass("active");
        $("#webcam").removeClass("active");
        $("#liMicrophone").addClass("active");
        $("#microphone").addClass("active");
    });

    $("#btnMicrophoneError").click(function () {
        $("#MicrophoneState").removeClass("question-icon").removeClass("tick-icon").addClass("cancel-icon");
        $("#liMicrophone").removeClass("active");
        $("#microphone").removeClass("active");
        $("#liSpeaker").addClass("active");
        $("#speaker").addClass("active");
    });

    $("#btnMicrophoneOk").click(function () {
        $("#MicrophoneState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
        $("#liMicrophone").removeClass("active");
        $("#microphone").removeClass("active");
        $("#liSpeaker").addClass("active");
        $("#speaker").addClass("active");
    });

    $("#btnSpeakerError").click(function () {
        $("#SpeakerState").removeClass("question-icon").removeClass("tick-icon").addClass("cancel-icon");
    });

    $("#btnSpeakerOk").click(function () {
        if ($("#MicrophoneState").hasClass("tick-icon") && $("#WebcamState").hasClass("tick-icon") && $("#PluginState").hasClass("tick-icon") && $("#internetState").hasClass("tick-icon")) {
            $("#SpeakerState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
            validatePeripherals = true;
            if (config.meetingId != "") {
                SubmitDeviceCheckStatus();
            }
        } else {
            alert("Please verify all steps.");
        }
    });

    function SubmitDeviceCheckStatus() {
        var body = {
            meetingId: config.meetingId,
            timestamp: new Date().toISOString(),
            checks: {
                speedtest: {
                    ping: speedtest.avgPing,
                    up: speedtest.avgUpload,
                    down: speedtest.avgDownload
                },
                plugin: pluginVerified,
                peripherals: validatePeripherals
            }
        };
        var url = config.WebPortalBaseUrl + '/Relay/DeviceCheck'
        var promise = $.ajax({
            url: url,
            type: 'POST',
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(body)
        });

        promise.then(function (data) {
            alert("Thank you for completing the device test, you may now close this page.");
            console.log("Sent device check status.");
            conversation.leave();
        }).catch(function (err) {
            alert("Could not submit device test results; please try again later.");
            console.log("Failed to send device check status.", err);
        });
        return promise;
    }

    function checkPlugin() {
        var pluginManager = Skype.Web.Media.PluginManager();
        return pluginManager.init().finally(function () {
            if ((pluginManager.isPluginInstalled()) && (pluginManager.installedVersion().split('.')[0] >= 16)) {
                document.getElementById("PluginStatus").innerHTML = "Plugin is installed.";
                pluginVerified = true;
                $("#PluginState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
                $("#btnPluginOk").removeAttr("disabled");
            } else {
                document.getElementById("PluginStatus").innerHTML = "Plugin is not installed.";
                pluginVerified = false;
                $("#PluginState").removeClass("question-icon").removeClass("tick-icon").addClass("cancel-icon");
                $("#downloadPlugins").css("display", "block");
            }
        });
    }

    function SubscribeToDevices() {
        SubscribeToEvents();
        ListAvailableDevices();
        ShowCurrentDevices();
    }

    function SubscribeToEvents() {
        var app = window.skypeWebApp;
        app.devicesManager.cameras.subscribe();
        app.devicesManager.microphones.subscribe();
        app.devicesManager.speakers.subscribe();
    }

    function ListAvailableDevices() {
        window.skypeWebApp.devicesManager.cameras.added(function (newCamera) {
            $('#cameras')
                .append($("<option></option>")
                .attr("value", newCamera.id())
                .text(newCamera.name()));
        });

        window.skypeWebApp.devicesManager.microphones.added(function (newMicrophone) {
            $('#mics')
                .append($("<option></option>")
                .attr("value", newMicrophone.id())
                .text(newMicrophone.name()));
        });

        window.skypeWebApp.devicesManager.speakers.added(function (newSpeaker) {
            $('#speakers')
                .append($("<option></option>")
                .attr("value", newSpeaker.id())
                .text(newSpeaker.name()));
        });
    }

    function ShowCurrentDevices() {
        window.skypeWebApp.devicesManager.selectedCamera.changed(function (theCamera) {
            $('#selectedCamera').text(theCamera.name());
        });

        window.skypeWebApp.devicesManager.selectedMicrophone.changed(function (theMicrophone) {
            $('#selectedMicrophone').text(theMicrophone.name());
        });

        window.skypeWebApp.devicesManager.selectedSpeaker.changed(function (theSpeaker) {
            $('#selectedSpeaker').text(theSpeaker.name());
        });
    }

    //listen for changes to the device drop downs
    $('#cameras').change(function () {
        var chosenCameraId = $('#cameras').val();
        window.skypeWebApp.devicesManager.cameras.get().then(function (list) {
            for (var i = 0; i < list.length; i++) {
                var camera = list[i];
                if (camera.id() == chosenCameraId) {
                    window.skypeWebApp.devicesManager.selectedCamera.set(camera);
                }
            }
        });
    });

    $('#mics').change(function () {
        var chosenMicId = $('#mics').val();
        window.skypeWebApp.devicesManager.microphones.get().then(function (list) {
            for (var i = 0; i < list.length; i++) {
                var microphone = list[i];
                if (microphone.id() == chosenMicId) {
                    window.skypeWebApp.devicesManager.selectedMicrophone.set(microphone);
                }
            }
        });
    });

    $('#speakers').change(function () {
        var chosenSpeakerId = $('#speakers').val();
        window.skypeWebApp.devicesManager.speakers.get().then(function (list) {
            for (var i = 0; i < list.length; i++) {
                var speaker = list[i];
                if (speaker.id() == chosenSpeakerId) {
                    window.skypeWebApp.devicesManager.selectedSpeaker.set(speaker);
                }
            }
        });
    });
});

// speedtest.js requires button be clicked twice, so do one click on behalf of the user now
$(window).ready(function () {
    $('#stbutton').click().on('click', function () {
        // TODO: Attach a callback instead of inspecting button state
        if ($(this).text() == 'Stop') {
            document.getElementById("net_check_result").innerHTML = "Network speed test in progress ...";
            $('#net_check_icon').show();
        }
        else {
            document.getElementById("net_check_result").innerHTML = "Network speed test was cancelled.";
            $('#net_check_icon').hide();
        }
    });
});

var previousVal = "";
function InputChangeListener() {
    if ($('#uploadValue').text() != previousVal) {
        previousVal = $('#uploadValue').text();
        console.log($('#uploadValue').text());
        $('#net_check_icon').attr('src', '/Content/Images/tick.png');
        watchspeed();
        $("#internetState").removeClass("question-icon").removeClass("cancel-icon").addClass("tick-icon");
        $("#btnInternetOk").removeAttr("disabled");
    }
}
var handle = setInterval(InputChangeListener, 500);
function watchspeed() {
    var downloadspeed = Number(($('#downloadValue').text()).replace(/[^\d.-]/g, ''));
    var uploadspeed = Number(($('#uploadValue').text()).replace(/[^\d.-]/g, ''));
    var pingSpeed = Number(($('#pingValue').text()).replace(/[^\d.-]/g, ''));
    console.log('Download speed:', downloadspeed);
    console.log('Upload speed: ', uploadspeed);

    if ((downloadspeed <= 5) || (uploadspeed <= 5)) {
        document.getElementById("net_check_result").innerHTML = "Slow network speed - Only Audio is recommended";
        console.log('slow');
    }
    else if ((downloadspeed <= 10 && downloadspeed >= 5) || (uploadspeed > 5 && uploadspeed <= 10)) {

        document.getElementById("net_check_result").innerHTML = "Average network speed - Audio & Video are recommended";
        console.log('average');
    }
    else if ((downloadspeed > 10 || uploadspeed > 10)) {
        document.getElementById("net_check_result").innerHTML = "Fast network speed - Audio, Video are recommended ";
        console.log('fast');
    }
    else {
        document.getElementById("net_check_result").innerHTML = "Fast network speed - Audio, Video & Sharing are recommended ";
    }

    var averageBandWidth = (downloadspeed + uploadspeed) / 2;
    speedtest.avgDownload = downloadspeed;
    speedtest.avgUpload = uploadspeed;
    speedtest.avgPing = pingSpeed;
    clearInterval(handle);
};