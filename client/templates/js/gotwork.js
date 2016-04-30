/* global $, server, vdpRequester, Meteor, Template, grecaptcha, libraryDB, reCAPTCHA */

Template.gotwork.onCreated(function() {
    reCAPTCHA.config({
        publickey: '6LdPdx4TAAAAAG9flA_8cvluOQ3YvSHF9zmXwFy2'
    });
});

Template.gotwork.onRendered(function() {
    Meteor.subscribe('library',{onReady: function() {
        $('.example').each(function() {
            var example=$(this);
            var library=libraryDB.findOne({name: example.data('example')},{fields: {url: 1,_id: 0}});
            if (library && library.url.length>0) {
                example.load(library.url, function(text) {
                    example.text(text).sunlight();
                });
            }
        });
    }});

    $('#server').sunlight();
    $('#disconnect').sunlight();
});

Template.gotwork.helpers({
    server: function() {
        return server;
    },
    examplelibraries: function() {
        return libraryDB.find({example: true});
    }
});

Template.gotwork.events({
    'click button[type=submit]': function() {
        $('#formConfirmation').hide();
        if ($('#email').val().length==0) $('#email').parent().addClass('has-error');
        if ($('#jobname').val().length==0) $('#jobname').parent().addClass('has-error');
        if ($('#description').val().length==0) $('#description').parent().addClass('has-error');
        if ($('#url').val().length==0) $('#url').parent().addClass('has-error');
        var captcha=grecaptcha.getResponse();
        if ($('form').find('.has-error').length>0) {
            $('#formResponse').removeClass('label-success').addClass('label-danger').text('You\'ve not yet completed the form').show();
            return false;
        }
        if (captcha.length==0) {
            $('#formResponse').removeClass('label-success').addClass('label-danger').text('You\'ve not shown how human you are').show();
            return false;
        }
        var document={
            email: $('#email').val(),
            name: $('#jobname').val(),
            description: $('#description').val(),
            link: $('#link').val(),
            url: $('#url').val(),
            example: false,
            confirmed: false
        };
        libraryDB.insert(document,function(error,id) {
            if (typeof error!='undefined') {
                if (error.message.indexOf('duplicate key')>0) {
                    $('#formResponse').removeClass('label-success').addClass('label-danger').text('Sorry, I\'ve already got that job name. Try another').show();
                    $('#formResponse').parent().addClass('has-error');
                }
                else $('#formResponse').removeClass('label-success').addClass('label-danger').text('Oh dear, that didn\'t work, please retry or contact me').show();
            } else {
                $('#formResponse').removeClass('label-danger').addClass('label-success').text('OK, all good. I\'ll be in touch.').show();
                $('#newjobid samp').text(id);
                $('#newjobid').show();
                $('#testajob').attr('href','testjob#'+id);
            }
        });
        return false;
    },
    'click button.demo-disconnect': function() {
        vdpRequester.disconnect();
    },
    'input form input': function(event) {
        $(event.target).parent().removeClass('has-error');
        $('#formConfirmation').hide();
        $('#formError').hide();
    }
});
