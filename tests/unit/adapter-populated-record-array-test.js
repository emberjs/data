import {setupStore, createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

import isEnabled from 'ember-data/-private/features';

var Person, store;
var run = Ember.run;

var adapter = DS.Adapter.extend({
  deleteRecord() {
    return Ember.RSVP.Promise.resolve();
  }
});

module("unit/adapter_populated_record_array - DS.AdapterPopulatedRecordArray", {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    store = createStore({
      adapter: adapter,
      person: Person
    });
  }
});

test("when a record is deleted in an adapter populated record array, it should be removed", function(assert) {
  var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(store.modelFor('person'), null);
  var payload = {
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
  };

  run(function() {
    var records = store.push(payload);
    recordArray.loadRecords(records, payload);
  });

  assert.equal(recordArray.get('length'), 3, "expected recordArray to contain exactly 3 records");

  run(function() {
    recordArray.get('firstObject').destroyRecord();
  });

  assert.equal(recordArray.get('length'), 2, "expected recordArray to contain exactly 2 records");
});

test("stores the metadata off the payload", function(assert) {
  var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(store.modelFor('person'), null);
  var payload = {
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
    }],
    meta: {
      foo: 'bar'
    }
  };

  run(function() {
    var records = store.push(payload);
    recordArray.loadRecords(records, payload);
  });

  assert.equal(recordArray.get('meta.foo'), 'bar', 'expected meta.foo to be bar from payload');
});

if (isEnabled('ds-links-in-record-array')) {
  test('stores the links off the payload', function(assert) {
    var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(store.modelFor('person'), null);
    var payload = {
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
      }],
      links: {
        first: '/foo?page=1'
      }
    };

    run(function() {
      var records = store.push(payload);
      recordArray.loadRecords(records, payload);
    });

    assert.equal(recordArray.get('links.first'), '/foo?page=1', 'expected links.first to be "/foo?page=1" from payload');
  });
}

test('recordArray.replace() throws error', function(assert) {
  var recordArray = store.recordArrayManager
    .createAdapterPopulatedRecordArray(Person, null);

  assert.throws(function() {
    recordArray.replace();
  }, Error("The result of a server query (on (subclass of DS.Model)) is immutable."), 'throws error');
});

test("when an adapter populated record gets updated the array contents are also updated", function(assert) {
  assert.expect(8);
  var filteredPromise, filteredArr, findPromise, findArray;
  var env = setupStore({ person: Person });
  var store = env.store;
  var array = [{ id: '1', name: "Scumbag Dale" }];

  // resemble server side filtering
  env.adapter.query = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve(array.slice(query.slice));
  };

  // implement findAll to further test that query updates won't muddle
  // with the non-query record arrays
  env.adapter.findAll = function(store, type, sinceToken) {
    return Ember.RSVP.resolve(array.slice(0));
  };

  run(function() {
    filteredPromise = store.query('person', { slice: 1 });
    findPromise = store.findAll('person');

    // initialize adapter populated record array and assert initial state
    filteredPromise.then(function(_filteredArr) {
      filteredArr = _filteredArr;
      assert.equal(filteredArr.get('length'), 0, "No records for this query");
      assert.equal(filteredArr.get('isUpdating'), false, "Record array isUpdating state updated");
    });

    // initialize a record collection array and assert initial state
    findPromise.then(function(_findArr) {
      findArray = _findArr;
      assert.equal(findArray.get('length'), 1, "All records are included in collection array");
    });
  });

  // a new element gets pushed in record array
  run(function() {
    array.push({ id: '2', name: "Scumbag Katz" });
    filteredArr.update().then(function() {
      assert.equal(filteredArr.get('length'), 1, "The new record is returned and added in adapter populated array");
      assert.equal(filteredArr.get('isUpdating'), false, "Record array isUpdating state updated");
      assert.equal(findArray.get('length'), 2);
    });
  });

  // element gets removed
  run(function() {
    array.pop(0);
    filteredArr.update().then(function() {
      assert.equal(filteredArr.get('length'), 0, "Record removed from array");
      // record not removed from the model collection
      assert.equal(findArray.get('length'), 2, "Record still remains in collection array");
    });
  });

});
