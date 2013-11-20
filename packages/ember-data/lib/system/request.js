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
    this.endPage = this.page || 1;
    this.deferred = Ember.RSVP.defer();
    this.promiseHead = this.deferred.promise;
    this.sinceToken = this.store.typeMapFor(this.type).metadata.since;
  },

  loadMore: function( array ) {
    var nextPage = +this.endPage + 1,
        request = this,
        resolver = Ember.RSVP.defer(),
        reject = resolver.reject;
    // ensure that pages are loaded in order
    this.promiseHead.then(function() {
      request.promiseHead = request.loadPage(nextPage, array).then(function(more) {
        array.pushObjects(get(more, 'content'));
        resolver.resolve(array);
      }, reject);
    }, reject);
    return resolver.promise;
  },

  loadPage: function( page ) {
    var store = get(this, 'store'),
        type = get(this, 'type'),
        query = get(this, 'query');
    Ember.assert('You tried to call Request.loadPage but no fetchPage method has been provided', this.fetchPage);
    this.endPage = page;
    return this.fetchPage(store, type, query, page);
  }

});
