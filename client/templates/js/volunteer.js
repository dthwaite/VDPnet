/* global Template, ReactiveVar, WebWorkerControl, server*/

var connected=new ReactiveVar(false);
var control;                                // The controlling WebSocket connection to the server

Template.volunteer.helpers({
    noWorkers: function() {
        return !WebWorkerControl.hasWorkers();
    },
    connected: function() {
        return connected.get();
    },
    connectedOrWorkers: function() {
        return connected.get() || WebWorkerControl.hasWorkers();
    },
    notConnectedAndWorkers: function() {
        return !connected.get() && WebWorkerControl.hasWorkers();
    }
});



Template.volunteer.events({
    'click button#allowAccess': function() {
        // Start a new controlling connection with the server
        control=new WebSocket(server,'C4');

        // Once we have a controlling connection with the server we tell existing workers to restart
        control.onopen=function() {
            WebWorkerControl.startAll();
            WebWorkerControl.checkAvailability(control);
            connected.set(true);
        };

        // On receipt of a message from the server to ask us to service a particular library
        control.onmessage=function(event) {
            WebWorkerControl.setLibrary(JSON.parse(event.data),control);
        };

        // If our controlling connection to the server closes we stop all our workers
        control.onclose=function() {
            WebWorkerControl.stopAll();
            connected.set(false);
        };

    },
    'click button#stopAccess': function() {
        control.close();
    }
});



