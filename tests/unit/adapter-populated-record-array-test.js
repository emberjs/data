var Person, store;
var run = Ember.run;

var adapter = DS.Adapter.extend({
  deleteRecord: function() {
    return Ember.RSVP.Promise.resolve();
  }
});

module("unit/adapter_populated_record_array - DS.AdapterPopulatedRecordArray", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    store = createStore({
      adapter: adapter,
      person: Person
    });
  }
});

test("when a record is deleted in an adapter populated record array, it should be removed", function() {
  var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(store.modelFor('person'), null);

  run(function() {
    var records = store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Scumbag Katz'
        }
      }, {
        type: 'person',
        id: '3',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }]
    });
    recordArray.loadRecords(records);
  });

  equal(recordArray.get('length'), 3, "expected recordArray to contain exactly 3 records");

  run(function() {
    recordArray.get('firstObject').destroyRecord();
  });

  equal(recordArray.get('length'), 2, "expected recordArray to contain exactly 2 records");
});

test('recordArray.replace() throws error', function() {
  var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(Person, null);

  throws(function() {
    recordArray.replace();
  }, Error("The result of a server query (on (subclass of DS.Model)) is immutable."), 'throws error');
});
