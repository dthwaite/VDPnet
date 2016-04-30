/* global Template, WebWorkerControl */

Template.worker.helpers({
    workers: WebWorkerControl.workerlist.find()
});
