var Person, array, store;
var run = Ember.run;

var adapter = DS.Adapter.extend({
  deleteRecord: function() {
    return Ember.RSVP.Promise.resolve();
  }
});

module("unit/adapter_populated_record_array - DS.AdapterPopulatedRecordArray", {
  setup: function() {

    store = createStore({
      adapter: adapter
    });

    array = [{ id: '1', name: "Scumbag Dale" },
             { id: '2', name: "Scumbag Katz" },
             { id: '3', name: "Scumbag Bryn" }];

    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  }
});

test("when a record is deleted in an adapter populated record array, it should be removed", function() {
  var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(Person, null);

  run(function() {
    recordArray.load(array);
  });

  equal(recordArray.get('length'), 3, "expected recordArray to contain exactly 3 records");

  run(function() {
    recordArray.get('firstObject').destroyRecord();
  });

  equal(recordArray.get('length'), 2, "expected recordArray to contain exactly 2 records");
});
