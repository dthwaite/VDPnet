/* global $, host, Template */

Template.runjob.events({
    'input.demo-input': function(event) {
        var target = $(event.target);
        var demo = target.closest('.demo');
        demo.find('.demo-result').text('');
        var job = demo.attr('data-job');
        var javascript = '';
        var box = demo.find('.javascript').empty();
        javascript = 'vdpRequester.send("' + job + '","' + target.val() + '",function(error,result) {\n\t' +
            'if (error) outputText.text(error).removeClass("label-warning label-success").addClass("label-danger");\n\t' +
            'else outputText.text(result).removeClass("label-warning label-danger").addClass("label-success");\n});';
        box.append('<pre class="sunlight-highlight-javascript">' + javascript + '</pre>').find('pre').sunlight();

    },
    'click button.demo-execute': function(event) {
        var row = $(event.target).closest('.demo');
        var outputText = row.find('.demo-result');
        var code = row.find('.sunlight-javascript').text();
        outputText.html('No response yet? Maybe you should <a href="http://' + host + '" target="_blank">volunteer</a>')
                    .removeClass('label-danger label-success').addClass('label-warning');
        eval(code);
    }
});
