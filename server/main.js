/* global Meteor, clientDB, requestorDB, servicerDB, libraryDB, jobsDB */

Meteor.startup(function() {
    var Logger = require('le_node');
    var log = new Logger({token: '5fc7701f-dac9-4814-a12d-0ec508b23c45'});
    var WS=require('ws');
    var waitingJobs=[];
    clientDB.remove({});
    requestorDB.remove({});
    servicerDB.remove({});
    libraryDB.allow({insert: function() {return true;}});

    Meteor.publish('networkStatus',function() {
        return [jobsDB.find(),clientDB.find(),requestorDB.find(),servicerDB.find()];
    });
    Meteor.publish('library',function() {
        return [libraryDB.find()];
    });

    var wss=new WS.Server({ port: Meteor.settings.public.WS_PORT,clientTracking: true },function() {
        log.info('Web sockets server opened on port '+Meteor.settings.public.WS_PORT);
    });

    wss.on('connection', Meteor.bindEnvironment(function(ws) {
        switch (ws.protocol.charAt(0)) {
        case 'C':
            ws.libraries = [];
            ws.maxlibraries=parseInt(ws.protocol.charAt(1));
            ws.on('message', Meteor.bindEnvironment(function(message) {
                ws.libraries = JSON.parse(message);
                clientDB.update(ws.clientId,{$set: {libraries: ws.libraries}});
                checkAvailability(ws);
            })).on('close',Meteor.bindEnvironment(function() {
                clientDB.remove(ws.clientId);
            }));
            ws.clientId=clientDB.insert({ip: ws.upgradeReq.connection.remoteAddress,libraries: ws.libraries});
            break;
        case 'S':
            if (libraryDB.findOne({name: ws.protocol.substr(1)},{fields: {_id: 1}})) {
                ws.available=true;
                ws.on('close',Meteor.bindEnvironment(function() {
                    servicerDB.remove(ws.clientId);
                }));
                ws.clientId = servicerDB.insert({
                    ip: ws.upgradeReq.connection.remoteAddress,
                    library: ws.protocol.substr(1),
                    jobCount: 0
                });
                findWaitingJob(ws);
            } else ws.close();
            break;
        case 'R':
            if (libraryDB.findOne({name: ws.protocol.substr(1)},{_id: 1})) {
                ws.on('message', Meteor.bindEnvironment(function(data) {
                    requestorDB.update(ws.clientId, {$inc: {requests: 1}});
                    processRequest({
                        requester: ws,
                        data: data,
                        id: jobsDB.insert({library: ws.protocol.substr(1), status: 'created', created: new Date()})
                    });
                })).on('close', Meteor.bindEnvironment(function() {
                    requestorDB.remove(ws.clientId);
                    for (var i = 0; i < waitingJobs.length; i++) {
                        if (waitingJobs[i].job == ws.clientId) {
                            waitingJobs.splice(i, 1);
                            break;
                        }
                    }
                }));
                ws.clientId = requestorDB.insert({
                    ip: ws.upgradeReq.connection.remoteAddress,
                    library: ws.protocol.substr(1),
                    requests: 0
                });
            } else ws.close();
            break;
        default:
            ws.close();
        }
    }));

    function checkAvailability(client) {
        if (client.libraries.length<client.maxlibraries) {
            for (var i=0; i<waitingJobs.length; i++) {
                if (client.libraries.indexOf(waitingJobs[i].requester.protocol.substr(1))<0) {
                    requestLibrary(client,waitingJobs[i].requester);
                }
            }
        }
    }
    function findWaitingJob(servicer) {
        for (var i = waitingJobs.length-1; i >=0; i--) {
            if (waitingJobs[i].requester.protocol.substr(1) == servicer.protocol.substr(1)) {
                var job=waitingJobs.splice(i, 1)[0];
                if (job.requester.readyState==WS.OPEN) {
                    dispatch(servicer, job);
                    return;
                }
            }
        }
    }

    function requestLibrary(client,requester) {
        var library=libraryDB.findOne({name: requester.protocol.substr(1),confirmed: true},{fields: {_id: 0}});
        if (library) client.send(JSON.stringify(library));
        else requester.close();
    }

    function processRequest(job) {
        var i;
        if (job.requester.readyState==WS.OPEN) {
            for (i=0; i<wss.clients.length; i++) {
                if (wss.clients[i].available && wss.clients[i].protocol.substr(1)==job.requester.protocol.substr(1) && wss.clients[i].readyState==WS.OPEN) {
                    dispatch(wss.clients[i],job);
                    return;
                }
            }
            for (i=0; i<wss.clients.length; i++) {
                if (wss.clients[i].protocol.charAt(0)=='C' && wss.clients[i].libraries.length<wss.clients[i].maxlibraries && wss.clients[i].libraries.indexOf(job.requester.protocol.substr(1))<0) {
                    requestLibrary(wss.clients[i],job.requester);
                }
            }
            waitingJobs.push(job);
            jobsDB.update(job.id,{$set: {waiting: new Date(),status: 'waiting'}});
        }
    }

    function dispatch(me,job) {
        function closeHandler() {
            if (!me.available) processRequest(job);
            me.available=false;
            servicerDB.remove(me.clientId);
        }
        function messageHandler(data) {
            jobsDB.update(job.id,{$set: {completed: new Date(),status: 'completed'}});
            if (job.requester.readyState==WS.OPEN) job.requester.send(data,Meteor.bindEnvironment(function(error) {
                if (typeof error=='undefined') {
                    jobsDB.update(job.id,{$set: {delivered: new Date(),status: 'delivered'}});
                    servicerDB.update(me.clientId,{$inc: {jobCount: 1}});
                }
            }));
            me.available=true;
            findWaitingJob(me);
        }
        me.removeAllListeners('message').on('message',Meteor.bindEnvironment(messageHandler)).removeAllListeners('close').on('close',Meteor.bindEnvironment(closeHandler));
        me.send(job.data,Meteor.bindEnvironment(function(error) {
            if (typeof error!=='undefined') processRequest(job);
            else jobsDB.update(job.id,{$set: {dispatched: new Date(),status: 'dispatched'}});
        }));
        me.available=false;
    }

});
