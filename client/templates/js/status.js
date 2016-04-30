/* global Meteor, Template, ReactiveVar, jobsDB, clientDB,requestorDB, servicerDB */

Template.status.onCreated(function() {
    Meteor.subscribe('networkStatus');
    Meteor.subscribe('library');
    Meteor.setInterval(setDate, 60000);
    this.today = new ReactiveVar();
    var me=this;
    function setDate() {
        var date=new Date();
        date.setDate(date.getDate() - 1);
        me.today.set(date);
    }
    setDate();
});

function twodigits(n) {
    return ('00'+n).substr(-2);
}

Template.status.helpers({
    jobs: function() {
        return jobsDB.find({$and: [{status: {$ne: 'delivered'}},
            {created: {$gte: Template.instance().today.get()}}]},{sort: {status: 1,created: 1}});
    },
    clients: function() {
        return clientDB.find({},{sort: {ip: 1}});
    },
    requestors: function() {
        return requestorDB.find({},{sort: {ip: 1}});
    },
    servicers: function() {
        return servicerDB.find({},{sort: {ip: 1}});
    },
    formatDate: function(date) {
        if (typeof date=='undefined') return '';
        else return date.getDate()+'-'+(date.getMonth()+1)+'-'+date.getFullYear()%100+' '+twodigits(date.getHours())+':'+twodigits(date.getMinutes())+':'+twodigits(date.getSeconds());
    },
    formatTime: function(date) {
        if (typeof date=='undefined') return '';
        else return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    },
    connected: function() {
        return Meteor.status().connected;
    }
});
