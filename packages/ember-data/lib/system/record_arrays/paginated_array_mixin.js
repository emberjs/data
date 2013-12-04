/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, computed = Ember.computed;

/**
  Provides pagination support for `RecordArray`s
  @class PaginatedArrayMixin
  @namespace DS
*/

DS.PaginatedArrayMixin = Ember.Mixin.create({

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

  pageSize: Ember.computed('meta.pageSize', function() {
    var pageSize = get(this, 'meta.pageSize');
    if (!pageSize) {
      pageSize = this.request.pageSize;
    }
    return pageSize;
  }),

  totalBinding: 'meta.total',

  totalPages: Ember.computed('pageSize', 'total', function() {
    var pageSize = get(this, 'pageSize'),
        total = get(this, 'total');
    if (pageSize > 0 && total !== undefined) {
      return Math.ceil(total / pageSize);
    }
  }),

  isFinished: Ember.computed('meta.isFinished', 'endPage', 'totalPages', function() {
    return get(this, 'meta.isFinished') || (get(this, 'endPage') >= get(this, 'totalPages'));
  }),

  loadMore: function() {
    var nextPage = +this.endPage + 1,
        request = this.request,
        array = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      // ensure that pages are loaded in order
      return array.promiseHead.then(function() {
        var nextPromise = request.loadPage(nextPage, array);
        nextPromise.then(function(more) {
          set(array, 'endPage', nextPage);
          array.pushObjects(get(more, 'content'));
          resolve(array);
        });
        request.promiseHead = nextPromise;
        return nextPromise;
      });
    });
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
