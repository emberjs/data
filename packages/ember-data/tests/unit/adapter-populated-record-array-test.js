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

test("when an adapter populated record gets updated the array contents are also updated", function() {
  expect(8);
  var filteredPromise, filteredArr, findPromise, findArray;
  var env = setupStore({ person: Person });
  var store = env.store;
  var array = [{ id: '1', name: "Scumbag Dale" }];

  // resemble server side filtering
  env.adapter.findQuery = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array.slice(query.slice));
  };

  // implement findAll to further test that query updates won't muddle
  // with the non-query record arrays
  env.adapter.findAll = function(store, type, sinceToken) {
    return Ember.RSVP.resolve(array.slice(0));
  };

  run(function() {
    filteredPromise = store.find(Person, { slice: 1 });
    findPromise = store.find(Person);

    // initialize adapter populated record array and assert initial state
    filteredPromise.then(function(_filteredArr) {
      filteredArr = _filteredArr;
      equal(filteredArr.get('length'), 0, "No records for this query");
      equal(filteredArr.get('isUpdating'), false, "Record array isUpdating state updated");
    });

    // initialize a record collection array and assert initial state
    findPromise.then(function(_findArr) {
      findArray = _findArr;
      equal(findArray.get('length'), 1, "All records are included in collection array");
    });
  });

  // a new element gets pushed in record array
  run(function() {
    array.push({ id: '2', name: "Scumbag Katz" });
    filteredArr.update().then(function() {
      equal(filteredArr.get('length'), 1, "The new record is returned and added in adapter populated array");
      equal(filteredArr.get('isUpdating'), false, "Record array isUpdating state updated");
      equal(findArray.get('length'), 2);
    });
  });

  // element gets removed
  run(function() {
    array.pop(0);
    filteredArr.update().then(function() {
      equal(filteredArr.get('length'), 0, "Record removed from array");
      // record not removed from the model collection
      equal(findArray.get('length'), 2, "Record still remains in collection array");
    });
  });

});
