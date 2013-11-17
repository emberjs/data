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
    this.promise = this.deferred.promise;
    this.resolve = this.deferred.resolve;
    this.reject = this.deferred.reject;
    this.sinceToken = this.store.typeMapFor(this.type).metadata.since;
  }

});
