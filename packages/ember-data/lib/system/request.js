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

  init: function() {
    this.deferred = Ember.RSVP.defer();
    this.sinceToken = this.store.metadataFor(this.type).since;
  },

  loadPage: function( page ) {
    var store = get(this, 'store'),
        type = get(this, 'type'),
        query = get(this, 'query');
    Ember.assert('You tried to call Request.loadPage but no fetchPage method has been provided', this.fetchPage);
    return this.fetchPage(store, type, query, page);
  }

});
