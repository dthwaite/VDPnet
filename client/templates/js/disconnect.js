/* global $, Meteor, Template, Tracker */

Template.disconnect.onCreated(function() {
    Tracker.autorun(function() {
        if (Meteor.status().connected) $('.disconnect-notice').hide();
        else $('.disconnect-notice').show();
    });
});
