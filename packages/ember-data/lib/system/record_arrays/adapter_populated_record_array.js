require("ember-data/system/record_arrays/record_array");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;

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
    var request = get(this, 'request');
    return request.loadMore(this);
  },

  loadPage: function( page ) {
    var request = get(this, 'request'),
        array = this;
    return request.loadPage(page).then(function (more) {
      array.setObjects(get(more, 'content'));
    });
  }

});
