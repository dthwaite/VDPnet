/* global Mongo, Meteor, Template, ReactiveVar, gistLink */

var workerlist=new Mongo.Collection(null); // in-memory collection of current workers
var workers={};                            // A reference to each Web Worker
var connected=new ReactiveVar(false);
var control;                                // The controlling WebSocket connection to the server
var server='ws://'+window.document.location.host.replace(/:.*/, '')+':'+Meteor.settings.public.WS_PORT;

Template.volunteer.helpers({
    noWorkers: function() {
        return workerlist.find().count()==0;
    },
    connected: function() {
        return connected.get();
    },
    connectedOrWorkers: function() {
        return connected.get() || workerlist.find().count()>0;
    },
    notConnectedAndWorkers: function() {
        return !connected.get() && workerlist.find().count()>0;
    },
    gistLink: function() {
        return gistLink.get();
    }
});

Template.worker.helpers({
    workers: workerlist.find()
});

Template.volunteer.events({
    'click button#allowAccess': function() {

        // Sends an array of library names to the server to indicate which libraries we are currently servicing
        function checkAvailability() {
            if (control.readyState==WebSocket.OPEN) {
                control.send(JSON.stringify(workerlist.find({}, {fields: {app: 1, _id: 0}}).fetch().map(function(item) {
                    return item.app;
                })));
            }
        }

        // Start a new controlling connection with the server
        control=new WebSocket(server,'C');

        // Once we have a controlling connection with the server we tell existing workers to restart
        control.onopen=function() {
            for (var worker in workers) {
                workers[worker].postMessage({cmd: 'start'});
            }
            checkAvailability();
            connected.set(true);
        };

        // On receipt of a message from the server to ask usto service a particular library
        control.onmessage=function(event) {
            var library=JSON.parse(event.data);
            if (workerlist.find({app: library.name}).count()==0) {
                // Only initiate a new worker if we've no worker that's already servicing this library
                workerlist.insert({app: library.name,gist: library.gist,description: library.description,js: []});
                workers[library.name]=new Worker('VDPwebworker.js');
                workers[library.name].postMessage({cmd: 'start',library: library,server: server});
                // Listen for status messages from this worker
                workers[library.name].addEventListener('message',function(event) {
                    var status=event.data;
                    switch (status.cmd) {
                    case 'wk_start':
                        checkAvailability();
                        break;
                    case 'wk_end':
                        workerlist.remove({app: status.library.name});
                        delete workers[status.library.name];
                        checkAvailability();
                        break;
                    case 'js_start':
                        workerlist.update({app: status.library.name},{$push: {js: {id: status.js}}});
                        break;
                    case 'js_end':
                        workerlist.update({app: status.library.name},{$pull: {js: {id: status.js}}});
                        break;
                    case 'job_start':
                        workerlist.update({app: status.library.name,js: {$elemMatch: {id: status.js}}},
                            {$set: {'js.$': {id: status.js,job: status.job,progress: status.progress,cpu: status.cpu,active: status.state}}});
                        break;
                    case 'job_end':
                        workerlist.update({app: status.library.name,js: {$elemMatch: {id: status.js}}},
                            {$set: {'js.$': {id: status.js}}});
                        break;
                    case 'job_status':
                        workerlist.update({app: status.library.name,js: {$elemMatch: {id: status.js}}},
                            {$set: {'js.$': {id: status.js,job: status.job,progress: status.progress,cpu: status.cpu,active: status.state}}});
                        break;
                    }
                });
            }
        };

        // If our controlling connection to the server closes we stop all our workers
        control.onclose=function() {
            for (var worker in workers) {
                workers[worker].postMessage({cmd: 'stop',app: worker});
            }
            connected.set(false);
        };

    },
    'click button#stopAccess': function() {
        control.close();
    }
});



