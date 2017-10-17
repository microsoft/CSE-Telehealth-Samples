// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

$(document).ready(function () {
    console.log('loaded');
    function receive(data) {
        console.log('recieved: ', data)
        $('#messages').append('<li>' + data + '</li>');
        if (data.startsWith('conf:sip')) {
            $('#frame').attr('src', data);
        }
    }

    var hubProxy = $.connection.uRIPassthroughHub;
    window.hubProxy = hubProxy;
    hubProxy.client.handleUri = function (uri) {
        console.log(uri);
        receive(uri);
    };

    $("#send").click(function () {
        hubProxy.server.sendURI($('#msg').val());
    });

    $.connection.hub.start()
        .done(function () { console.log('Now connected, connection ID=' + $.connection.hub.id); })
        .fail(function(e){ console.log('Could not Connect!', e); });
});