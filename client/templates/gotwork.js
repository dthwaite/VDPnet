/* global $, Meteor, Template, VDPrequester, grecaptcha, libraryDB */

var host = window.document.location.host.replace(/:.*/, '');
var vdpRequester=new VDPrequester('ws://'+host+':'+Meteor.settings.public.WS_PORT);

Template.gotwork.onRendered(function() {
    Meteor.subscribe('library',{onReady: function() {
        $('.example').each(function() {
            var example=$(this);
            var library=libraryDB.findOne({name: example.data('example')},{fields: {url: 1,_id: 0}});
            if (library && library.url.length>0) {
                example.load(library.url, function (text) {
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
        var host = window.document.location.host.replace(/:.*/, '');
        return 'ws://'+host+':'+Meteor.settings.public.WS_PORT;
    },
    examplelibraries: function() {
        return libraryDB.find({example: true});
    }
});

Template.gotwork.events({
    'input.demo-input': function(event) {
        var target = $(event.target);
        var demo = target.closest('.demo');
        demo.find('.demo-result').text('');
        var job = demo.attr('data-job');
        var input = parseInt(target.val());
        var javascript = '';
        var box = demo.find('.javascript').empty();
        if (!Number.isNaN(input) && input > 0) {
            javascript = 'vdpRequester.send("' + job + '",' + input + ',function(error,result) {\n\t' +
                'if (error) outputText.text(error).removeClass("label-warning label-success").addClass("label-danger");\n\t' +
                'else outputText.text(result).removeClass("label-warning label-danger").addClass("label-success");\n});';
            box.append('<pre class="sunlight-highlight-javascript">' + javascript + '</pre>').find('pre').sunlight();
        }

    },
    'click button.demo-execute': function(event) {
        var row = $(event.target).closest('.demo');
        var outputText = row.find('.demo-result'); // eslint-disable-line no-unused-vars
        var code = row.find('.sunlight-javascript').text();
        outputText.html('No response yet? Maybe you should <a href="http://'+host+'" target="_blank">volunteer</a>').removeClass("label-danger").removeClass("label-success").addClass("label-warning");
        eval(code);
    },
    'click button[type=submit]': function() {
        $('#formConfirmation').hide();
        if ($('#email').val().length==0) $('#email').parent().addClass('has-error');
        if ($('#jobname').val().length==0) $('#jobname').parent().addClass('has-error');
        if ($('#description').val().length==0) $('#description').parent().addClass('has-error');
        if ($('#url').val().length==0) $('#url').parent().addClass('has-error');
        var captcha=grecaptcha.getResponse();
        if ($('form').find('.has-error').length>0) {
            $('#formError').text('You\'ve not yet completed the form').show();
            return false;
        }
        if (captcha.length==0) {
            $('#formError').text('You\'ve not shown how human you are').show();
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
        libraryDB.insert(document,function(error) {
            if (typeof error!='undefined') {
                if (error.message.indexOf('duplicate key')>0) {
                    $('#formError').text('Sorry, I\'ve already got that job name. Try another').show();
                    $('#jobname').parent().addClass('has-error');
                }
                else $('#formError').text('Oh dear, that didn\'t work, please retry or contact me').show();
            } else $('#formConfirmation').show();
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
