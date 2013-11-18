/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;

/**
  @class Request
  @namespace DS
*/

DS.Request = Ember.Object.extend({

  store: null,
  type: null,
  promise: null,
  resolve: null,
  reject: null,
  sinceToken: null,
  page: null,
  pageSize: null,
  endPage: null,
  promiseHead: null,

  init: function() {
    this.endPage = this.page || 0;
    this.deferred = Ember.RSVP.defer();
    this.promise = this.promiseHead = this.deferred.promise;
    this.resolve = this.deferred.resolve;
    this.reject = this.deferred.reject;
    this.sinceToken = this.store.typeMapFor(this.type).metadata.since;
  },

  loadMore: function( array ) {
    var store = get(this, 'store'),
        type = get(this, 'type'),
        query = get(this, 'query'),
        that = this;

    Ember.assert('You tried to call loadMore but no fetchPage method has been provided', this.fetchPage);
    this.promiseHead.then(function() {
      that.promiseHead = that.fetchPage(store, type, query, ++that.endPage).then(function(more) {
        array.pushObjects(get(more, 'content'));
      });
    });
  }

});
