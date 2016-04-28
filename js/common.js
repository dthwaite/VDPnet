/* global Meteor, Mongo, Router */

Meteor.startup(function() {
    libraryDB = new Mongo.Collection('library');    // eslint-disable-line no-undef
    jobsDB=new Mongo.Collection('jobs');            // eslint-disable-line no-undef
    clientDB=new Mongo.Collection('clients');       // eslint-disable-line no-undef
    requestorDB=new Mongo.Collection('requestors'); // eslint-disable-line no-undef
    servicerDB=new Mongo.Collection('servicers');   // eslint-disable-line no-undef
});

Router.route('/', function() {
    this.render('volunteer');
});

Router.route('gotwork', function() {
    this.render('gotwork');
});

Router.route('status', function() {
    this.render('status');
});
