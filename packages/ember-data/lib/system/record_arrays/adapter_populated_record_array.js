require("ember-data/system/record_arrays/record_array");

var get = Ember.get, set = Ember.set;

DS.AdapterPopulatedRecordArray = DS.RecordArray.extend({
  query: null,

  replace: function() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  load: function(array) {
    var store = get(this, 'store'), type = get(this, 'type');

    var references = store.loadMany(type, array);

    this.beginPropertyChanges();
    set(this, 'content', Ember.A(references));
    set(this, 'isLoaded', true);
    this.endPropertyChanges();

    this.trigger('didLoad');
  }
});
