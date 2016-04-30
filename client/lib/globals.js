/* global Mongo, Meteor */

host = window.document.location.host.replace(/:.*/, '');    // eslint-disable-line no-undef
server='ws://'+host+':'+Meteor.settings.public.WS_PORT;     // eslint-disable-line no-undef
vdpRequester=new VDPrequester(server);                      // eslint-disable-line no-undef
WebWorkerControl={                                          // eslint-disable-line no-undef
    workers: [],
    workerlist: new Mongo.Collection(null),
    checkAvailability: function(controller) {
        if (controller.readyState==WebSocket.OPEN) {
            controller.send(JSON.stringify(this.workerlist.find({}, {fields: {app: 1, _id: 0}}).fetch().map(function(item) {
                return item.app;
            })));
        }
    },
    getWorker: function(library) {
        return this.workers[library];
    },
    hasWorkers: function() {
        return this.workerlist.find().count()>0;
    },
    startAll: function() {
        for (var worker in this.workers) {
            this.workers[worker].postMessage({cmd: 'start',app: worker});
        }
    },
    stopAll: function() {
        for (var worker in this.workers) {
            this.workers[worker].postMessage({cmd: 'stop',app: worker});
        }
    },
    setLibrary: function(library,controller) {
        var me=this;
        if (me.workerlist.find({app: library.name}).count() == 0) {
            // Only initiate a new worker if we've no worker that's already servicing this library
            me.workerlist.insert({app: library.name, protocol: controller.protocol, gist: library.gist, description: library.description, js: []});
            me.workers[library.name] = new Worker('VDPwebworker.js');
            me.workers[library.name].postMessage({
                cmd: 'start',
                library: library,
                server: server,                             // eslint-disable-line no-undef
                timeout: controller.protocol=='C0' ? 0 : 60 // The digit indicates the number of workers the server can start
            });                                             // If none, this is a test worker and should not time out

            // Listen for status messages from me worker
            me.workers[library.name].addEventListener('message', function(event) {
                var status = event.data;
                switch (status.cmd) {
                case 'wk_start':
                    me.checkAvailability(controller);
                    break;
                case 'wk_end':
                    me.workerlist.remove({app: status.library.name});
                    delete me.workers[status.library.name];
                    me.checkAvailability(controller);
                    break;
                case 'js_start':
                    me.workerlist.update({app: status.library.name}, {$push: {js: {id: status.js}}});
                    break;
                case 'js_end':
                    me.workerlist.update({app: status.library.name}, {$pull: {js: {id: status.js}}});
                    break;
                case 'job_start':
                    me.workerlist.update({app: status.library.name, js: {$elemMatch: {id: status.js}}},
                        {
                            $set: {
                                'js.$': {
                                    id: status.js,
                                    job: status.job,
                                    progress: status.progress,
                                    cpu: status.cpu,
                                    active: status.state
                                }
                            }
                        });
                    break;
                case 'job_end':
                    me.workerlist.update({app: status.library.name, js: {$elemMatch: {id: status.js}}},
                        {$set: {'js.$': {id: status.js}}});
                    break;
                case 'job_status':
                    me.workerlist.update({app: status.library.name, js: {$elemMatch: {id: status.js}}},
                        {
                            $set: {
                                'js.$': {
                                    id: status.js,
                                    job: status.job,
                                    progress: status.progress,
                                    cpu: status.cpu,
                                    active: status.state
                                }
                            }
                        });
                    break;
                }
            });
        }
    }
};
