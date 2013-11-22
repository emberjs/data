require("ember-data/system/record_arrays/record_array");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, computed = Ember.computed;

/**
  @class AdapterPopulatedRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
DS.AdapterPopulatedRecordArray = DS.RecordArray.extend({
  query: null,

  /**
    The Request that was used to create this record array.
    @property request
    @type DS.Request
  */
  request: null,

  endPage: null,
  promiseHead: null,

  init: function() {
    this._super();
    var page = this.request.page || 1;
    set(this, 'startPage', page);
    set(this, 'endPage', page);
    this.promiseHead = this.request.deferred.promise;
  },

  pageBinding: 'request.page',

  pageSize: Ember.computed(function() {
    var pageSize = get(this, 'meta.pageSize');
    if (!pageSize) {
      pageSize = this.request.pageSize;
    }
    return pageSize;
  }).property('meta.pageSize'),

  totalBinding: 'meta.total',

  totalPages: Ember.computed(function() {
    var pageSize = get(this, 'pageSize'),
        total = get(this, 'total');
    if (pageSize > 0 && total !== undefined) {
      return Math.ceil(total / pageSize);
    }
  }).property('pageSize', 'total'),

  isFinished: Ember.computed(function() {
    return get(this, 'meta.isFinished') || (get(this, 'endPage') >= get(this, 'totalPages'));
  }).property('meta.isFinished', 'endPage', 'totalPages'),

  replace: function() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  load: function(data) {
    var store = get(this, 'store'),
        type = get(this, 'type'),
        records = store.pushMany(type, data),
        meta = store.metadataFor(type);

    this.setProperties({
      content: Ember.A(records),
      isLoaded: true,
      meta: meta
    });

    // TODO: does triggering didLoad event should be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
  },

  loadMore: function() {
    var nextPage = +this.endPage + 1,
        request = this.request,
        resolver = Ember.RSVP.defer(),
        reject = resolver.reject,
        array = this;
    // ensure that pages are loaded in order
    this.promiseHead.then(function() {
      request.promiseHead = request.loadPage(nextPage, array).then(function(more) {
        set(array, 'endPage', nextPage);
        array.pushObjects(get(more, 'content'));
        resolver.resolve(array);
      }, reject);
    }, reject);
    return resolver.promise;
  },

  loadPage: function( page ) {
    var request = get(this, 'request'),
        array = this;
    return request.loadPage(page).then(function (more) {
      set(array, 'startPage', page);
      set(array, 'endPage', page);
      array.setObjects(get(more, 'content'));
    });
  }

});
