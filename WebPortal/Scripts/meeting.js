// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

var callRating = 0;

$(".rating-input").change(function () {
    if (this.checked) {
        callRating = this.value;
    }
});

$(document).ready(function () {
    InitializeConferenceCall();
});

Array.remove = function (array, from, to) {
    var rest = array.slice((to || from) + 1 || array.length);
    array.length = from < 0 ? array.length + from : from;
    return array.push.apply(array, rest);
};

//this variable represents the total number of popups can be displayed according to the viewport width
var total_popups = 0;

//arrays of popups ids
var popups = [];

function register_popup(participantEmail, id, name) {
    for (var iii = 0; iii < popups.length; iii++) {
        //already registered. Bring it to front.
        if (id == popups[iii]) {
            console.log("already registered at :" + iii + ", " + popups[iii]);
            Array.remove(popups, iii);

            popups.unshift(id);
            calculate_popups();
            return;
        }
    }

    var objExists = document.getElementById('chatPopUp_' + id);
    if (objExists == null) {
        var element = '<div id="' + id + '"><div id="chatPopUp_' + id + '" class="chatPopUp">' +
                '<div id="chatServiceWrap_' + id + '" class="chatServiceWrap"> ' +
                    '<div class="panel panel-primary">' +
                        '<div class="panel-heading" id="accordion">' +
                            '<span class="glyphicon glyphicon-comment"></span> ' + name +
                            '<div class="btn-group pull-right">' +
                                '<a type="button" class="btn btn-default-override btn-xs" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" >' +
                                    '<span class="glyphicon glyphicon-minus" id="chatMinimize_' + id + '" style="padding-right:10px"></span>' +
                                    '<span class="glyphicon glyphicon-remove" id="chatClose_' + id + '"></span>' +
                                '</a>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        '<div id="message-history_' + id + '" class="messages"></div>' +
                        '<div id="message-input">' +
                            '<input id="message_' + id + '" type="text" placeholder="Type Message here" style="border:1px solid black;width:100%"/>' +
                            //'<input type="button" class="btnChatSendMessages" value="Send Message" id="sendMessasge_'+id+'" />'+
                            '<a id="sendMessasge_' + id + '" class="iconfont sendmessage" title="Send Message" style="width:30px;vertical-align:middle;"></a>' +
                        '</div>' +
                            //'<div id="input-message" class="chatinput editable"' +
                            // 'contenteditable="true" placeholder="Type a message here"></div>' +

                    '</div>' +
                    '</div>' +
            '</div></div>';

        $('#multipleChats').append(element);

        $('#message-input').not('.chat-processed').addClass('chat-processed').on('keypress', function (evt) {
            if (evt.keyCode == 13) {
                evt.preventDefault();
                $('.sendmessage', this).click();
            }
        });

        $('#chatMinimize_' + id).attr('onclick', 'minimize_popup("' + id + '")');
        if (participantEmail != '') {
            $('#sendMessasge_' + id).click(function () { SendIMMessages(participantEmail, id); });
            $('#chatClose_' + id).click(function () { close_multipleChats(participantEmail, id); });
        }
        else {
            $('#sendMessasge_' + id).click(function () { sendMessage(config.meetingConferenceUri, id); });
            $('#chatClose_' + id).click(function () { close_multipleChats(config.meetingConferenceUri, id); });
        }
    }
    popups.unshift(id);
    calculate_popups();

}
function calculate_popups() {
    var width = window.innerWidth;
    if (width < 540) {
        total_popups = 0;
    }
    else {
        width = width - 200;
        //320 is width of a single popup box
        total_popups = parseInt(width / 320);
    }

    display_popups();

}
//displays the popups. Displays based on the maximum number of popups that can be displayed on the current viewport width
function display_popups() {
    var right = 0;

    var iii = 0;
    for (iii; iii < total_popups; iii++) {
        if (popups[iii] != undefined) {
            var element = document.getElementById('chatPopUp_' + popups[iii]);
            element.style.right = right + "px";
            right = right + 360;
            element.style.display = "block";
        }
    }

    for (var jjj = iii; jjj < popups.length; jjj++) {
        var element = document.getElementById('chatPopUp_' + popups[jjj]);
        element.style.display = "none";
    }
}
//this is used to close a popup
function minimize_popup(id) {
    for (var iii = 0; iii < popups.length; iii++) {
        if (id == popups[iii]) {
            Array.remove(popups, iii);

            document.getElementById('chatPopUp_' + id).style.display = "none";

            calculate_popups();

            return;
        }
    }
}

function close_multipleChats(participantEmail, id) {
    for (var iii = 0; iii < popups.length; iii++) {
        if (id == popups[iii]) {
            if (confirm("Are you sure you would like to close chat?")) {
                Array.remove(popups, iii);
                StopMultipleConversations(participantEmail);
                $('#' + id).remove();
                calculate_popups();
                return;
            }
        }
    }
}
function close_popup(meetingUri, id) {
    for (var iii = 0; iii < popups.length; iii++) {
        if (id == popups[iii]) {
            if (confirm("Are you sure you would like to close chat?")) {
                Array.remove(popups, iii);
                StopConversation(meetingUri);
                $('#' + id).remove();
                calculate_popups();
                return;
            }
        }
    }
}
//recalculate when window is loaded and also when window is resized.
window.addEventListener("resize", calculate_popups);
window.addEventListener("load", calculate_popups);

function InitializeConferenceCall() {
    $("#loadingImage").show();
    $("#displayAllElements").hide();
    JoinConference(config.meetingConferenceUri);

}
$('#btnChatService').click(function () {
    openChatWindow();
});

function ChatPopUpClose(id) {
    $('#chatPopUp_' + id).hide();
}
$('#chatClose').click(function () {
    $('#chatPopUp').hide();
});



$('#btnShowDevices').click(function () {
    $('#divDevicesPopUpBox').show();
});
$('#btnHideDevices').click(function () {
    $('#divDevicesPopUpBox').hide();
});

$('#btnHangUp, #hang-up').click(function () {
    if (confirm("Are you sure you would like to end the call?")) {
        hangUp();
    }
});

function hangUp() {
    HangUpCall(config.meetingConferenceUri);

    // In case they had not yet been admitted before the disconnect
    $('#landingContent').hide();

    $('#callControls').hide()
    $('#videoWindow').hide();
    $('#myVideo').hide();

    updateMeetingEndTime();
    openPopUpBox();
}

$('#btn-mute, #btn-unmute').click(function () {
    MuteAndUnMute(config.meetingConferenceUri);
});

$('#btn-show-video').click(function () {
    ShowMyVideo(config.meetingConferenceUri);
});
$('#btn-hide-video').click(function () {
    HideMyVideo(config.meetingConferenceUri);
});

$('#btn-start-video').click(function () {
    StartMyVideo(config.meetingConferenceUri);
});
$('#btn-stop-video').click(function () {
    StopMyVideo(config.meetingConferenceUri);
});
$('#btnSetDevices').click(function () {
    if (confirm("Are you sure you would like to update the active devices?")) {
        ChangeDevices(config.meetingConferenceUri);
        $('#divDevicesPopUpBox').hide();
        HideMyVideo(config.meetingConferenceUri);
        StopMyVideo(config.meetingConferenceUri);
    }
});

function getQueryStringParameter(paramToRetrieve) {
    var params = null;
    if (document.URL.split("?").length > 1) {
        var fullQueryString = document.URL.split("?")[1];
        if (-1 == fullQueryString.indexOf(paramToRetrieve)) {
            console.log("Decoded fullQueryString to " + atob(fullQueryString));
            fullQueryString = atob(fullQueryString);
        } else {
            console.log("No decoding required for " + fullQueryString);
        }

        params = fullQueryString.split("&");
        var strParams = "";
        for (var i = 0; i < params.length; i = i + 1) {
            var singleParam = params[i].split("=");
            if (singleParam[0] == paramToRetrieve)
                return singleParam[1];
        }
    }
    else {
        return null;
    }
}

$('#btnMinScreen').click(function () {
    appInsights.trackEvent("UI minimized");
    $('#allVideoControls').addClass('container');
    //$('#divCallControl').css('width', '80%');
    $('#callControlsWrapper').css('height', '514px');
    $('#btnMaxScreen').show();
    $('#btnMinScreen').hide();
});

$('#btnMaxScreen').click(function () {
    appInsights.trackEvent("UI maximized");
    $('#allVideoControls').removeClass('container');
    //$('#divCallControl').css('width', '100%');
    $('#callControlsWrapper').css('height', $(window).height() - 150);
    $('#btnMaxScreen').hide();
    $('#btnMinScreen').show();
});

$("#btnAddFeedback").click(function () {
    var oListItem;
    var currentUser;
    var audioIssues = false;
    var videoIssues = false;
    var comments = '';
    var audioIssueList = '';
    var videoIssueList = '';

    $('input[class=audio]').each(function () {
        if (this.checked) {
            audioIssues = true;
            if (audioIssueList == '') {
                audioIssueList = this.value;
            }
            else {
                audioIssueList = audioIssueList + ',' + this.value;
            }
        }
    });

    if (audioIssueList == '') {
        audioIssueList = 'None';
    }

    $('input[class=video]').each(function () {
        if (this.checked) {
            videoIssues = true;
            if (videoIssueList == '') {
                videoIssueList = this.value;
            }
            else {
                videoIssueList = videoIssueList + ',' + this.value;
            }
        }
    });

    if (videoIssueList == '') {
        videoIssueList = 'None';
    }

    comments = $('#comments').val();
    var browser = getBrowser();
    var body = {
        meetingId: config.meetingId,
        callRating: callRating,
        audioIssues: audioIssues,
        audioIssueList: audioIssueList,
        videoIssues: videoIssues,
        videoIssueList: videoIssueList,
        comments: comments,
        browser: browser
    }

    var url = config.WebPortalBaseUrl + '/Relay/CallQualitySurvey'
    var promise = $.ajax({
        url: url,
        type: 'POST',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(body),
    });

    promise.then(function (data) {
        console.log("Call quality survey.");
    }).catch(function (err) {
        console.log("Failed to call quality survey", err);
    });

    $("#divPopBox").hide();
});


function openPopUpBox() {
    $("#divPopBox").show();
}

$("#divPopBoxClose").click(function () {
    $("#divPopBox").hide();
});

function updateMeetingEndTime() {
    var body = {
        meetingId: config.meetingId,
        endTime: new Date().toISOString()
    };
    var url = config.WebPortalBaseUrl + '/Relay/MeetingEndTime'
    var promise = $.ajax({
        url: url,
        type: 'POST',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(body),
    });

    promise.then(function (data) {
        console.log("Sent meeting end time.");
    }).catch(function (err) {
        console.log("Failed to send meeting end time", err);
    });
    return promise;
}

function getBrowser() {
    var ua = navigator.userAgent, tem,
    M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M[0];
}
