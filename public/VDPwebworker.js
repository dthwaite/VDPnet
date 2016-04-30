/* global importScripts, VDPrequester */
importScripts('https://cdn.rawgit.com/dthwaite/VDPrequester/v1.0.0/lib/vdprequester.min.js');

(function() {
    var vdpRequester;   // VDP requester to call other jobs
    var library;        // The name of the library that this worker services
    var JobStreams=[];  // The list of streams that execute jobs
    var jobStreamIds=1; // Incremental ids of Job streams
    var closing;        // true if this worker is closing down
    var server;         // The VDP server
    var timeout;        // Number of seconds of activity before timeout (0=no timeout)

    // Sets up a listener to the controlling web page
    addEventListener('message',function(event) {
        switch (event.data.cmd) {
        case 'start':
            closing=false;
            if (typeof library=='undefined') {
                library=event.data.library;
                server=event.data.server;
                timeout=event.data.timeout;
                vdpRequester=new VDPrequester(server);
                importScripts(library.url);
                postMessage(workerReport('wk_start'));
            }
            newProductionLine();
            break;
        case 'stop':
            closing=true;
            for (var i=JobStreams.length-1; i>=0; i--) JobStreams[i].close();
            break;
        }
    });

    // Returns the basics of a report message to be sent back to the controlling web page
    function workerReport(cmd) {
        return {
            cmd: cmd,
            library: library
        };
    }

    // Sets up a new job stream if there are no idle ones
    function newProductionLine() {
        if (closing) return;
        for (var i=0; i<JobStreams.length; i++) {
            if (JobStreams[i].job===null || JobStreams[i].job.percent==100) return;
        }
        JobStreams.push(new ProductionLine());
    }

    var ProductionLine=function() {
        var me=this;
        this.id=jobStreamIds++;
        this.jobIds=1;
        this.job=null;
        this.start=new Date().getTime();
        this.cpu=0;
        this.websocket=new WebSocket(server,'S'+library.name);
        this.websocket.onmessage=function(event) {
            me.startJob(event.data);
        };
        this.websocket.onopen=function() {
            if (closing) me.close();
        };
        this.websocket.onclose=function() {
            for (var i=0; i<JobStreams.length; i++) {
                if (JobStreams[i].websocket==this) {
                    JobStreams.splice(i,1);
                    if (JobStreams.length==0) {
                        postMessage(workerReport('wk_end'));
                        self.close();
                    }
                }
            }
        };
        postMessage(this.report('js_start'));
        this.endJob();
    };

    ProductionLine.prototype.close=function() {
        if ((this.job!==null && this.job.percent<100) || this.websocket.readyState!=1) return;
        postMessage(this.report('js_end'));
        this.websocket.close();
    };

    ProductionLine.prototype.endJob=function() {
        var me=this;
        if (closing) me.close();
        else {
            if (timeout) {
                this.timer = setTimeout(function() {
                    me.close();
                }, timeout * 1000);
            }
        }
    };

    ProductionLine.prototype.startJob=function(data) {
        clearTimeout(this.timer);
        this.job=new Job(this,data);
        this.job.setActive(true);
        new self[library.name](this.job);
        this.job.setActive(false);
        newProductionLine();
    };

    ProductionLine.prototype.report=function(cmd) {
        var report=workerReport(cmd);
        report.js=this.id;
        return report;
    };

    var Job=function(productionLine,data) {
        this.productionLine=productionLine;
        this.id=productionLine.jobIds++;
        this.data=data;
        this.percent=0;
        this.state='waiting';
        this.cpu=0;
        postMessage(this.report('job_start'));
    };

    Job.prototype.complete=function(data) {
        if (this.percent<100) {
            this.percent = 100;
            this.productionLine.websocket.send(data);
            this.productionLine.endJob();
            postMessage(this.report('job_end'));
        }
    };

    Job.prototype.progress=function(percent) {
        percent=parseInt(percent);
        if (percent<=this.percent || percent>=100) return;
        this.percent=percent;
        postMessage(this.report('job_status'));
    };

    Job.prototype.report=function(cmd) {
        var report=this.productionLine.report(cmd);
        report.job=this.id;
        report.progress=this.percent;
        report.cpu=this.cpu;
        report.state=this.state;
        return report;
    };

    Job.prototype.send=function(data,callback,application) {
        var me=this;
        function response(error,data) {
            me.setActive(true);
            callback(error,data);
            me.setActive(false);
            newProductionLine();
        }
        if (typeof application == 'undefined') application = library.name;
        vdpRequester.send(application,data,response);
    };

    Job.prototype.setActive=function(state) {
        this.state=state ? 'working' : 'idle';
        if (this.percent<100) postMessage(this.report('job_status'));
    };

})();
