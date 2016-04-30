/* global $, WebWorkerControl,  Mongo, Template, ReactiveVar, libraryDB, Iron, Meteor, server */

var control;                    // The controlling connection to the server
var library=new ReactiveVar();  // The library that we are testing

function setup() {
    $('.sunlight-container').remove();
    $('#codeintroduction').hide().append('<pre id="testjobcode" class="sunlight-highlight-javascript"></pre>');
    $('#testjoberror').hide();
    library.set('');
    var id=$('input').val();
    if (id.length>0) {
        var lib;
        if (id.length == 24) lib = libraryDB.findOne(new Mongo.ObjectID(id));
        else lib = libraryDB.findOne(id);
        if (lib) {
            if (lib.url.indexOf('http://') == 0 || lib.url.indexOf('https://') == 0) {
                $('#testjobcode').load(lib.url, function(text) {
                    if (text.length > 0) {
                        $('#testjobcode').text(text).sunlight().show();
                        $('#codeintroduction').show();
                        library.set(lib);
                        WebWorkerControl.setLibrary(lib, control);
                    } else $('#testjoberror').text('The URL for this job is bad').show();
                });
            } else $('#testjoberror').text('The URL for this job is bad').show();
        } else $('#testjoberror').text('No job with this ID exists').show();
    } else $('#testjoberror').text('Err...need a job ID').show();
}

Template.testjob.onRendered(function() {
    $('.javascript').hide();
});

Template.testjob.helpers({
    library: function() {
        return library.get();
    },
    id: function() {
        return Iron.controller().getParams().hash;
    }
});

Template.testjob.events({
    'click button[type=submit]': setup,
    'input.demo-input': function() {
        $('.javascript').hide();
    }
});

Template.testjob.onCreated(function() {
    Meteor.subscribe('library');
    control=new WebSocket(server,'C0');
    control.onopen=WebWorkerControl.checkAvailability(control);
});
