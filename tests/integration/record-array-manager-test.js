import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var store, env;
var run = Ember.run;

var Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car', { async: false })
});

var Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person', { async: false })
});

var manager;

module("integration/record_array_manager", {
  beforeEach() {
    env = setupStore({
      adapter: DS.RESTAdapter.extend()
    });
    store = env.store;

    manager = store.recordArrayManager;

    env.registry.register('model:car', Car);
    env.registry.register('model:person', Person);
  }
});

function tap(obj, methodName, callback) {
  var old = obj[methodName];

  var summary = { called: [] };

  obj[methodName] = function() {
    var result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

test("destroying the store correctly cleans everything up", function(assert) {
  var query = { };
  var person;

  run(function() {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper'
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          cars: {
            data: [
              { type: 'car', id: '1' }
            ]
          }
        }
      }
    });
    person = store.peekRecord('person', 1);
  });

  var filterd = manager.createFilteredRecordArray(Person, function() { return true; });
  var filterd2 = manager.createFilteredRecordArray(Person, function() { return true; });
  var all = store.peekAll('person');
  var adapterPopulated = manager.createAdapterPopulatedRecordArray(Person, query);

  var filterdSummary = tap(filterd, 'willDestroy');
  var filterd2Summary = tap(filterd2, 'willDestroy');
  var allSummary = tap(all, 'willDestroy');
  var adapterPopulatedSummary = tap(adapterPopulated, 'willDestroy');

  assert.equal(filterdSummary.called.length, 0);
  assert.equal(filterd2Summary.called.length, 0);
  assert.equal(allSummary.called.length, 0);
  assert.equal(adapterPopulatedSummary.called.length, 0);

  assert.equal(person._internalModel._recordArrays.list.length, 3, 'expected the person to be a member of 3 recordArrays');

  Ember.run(filterd2, filterd2.destroy);
  assert.equal(person._internalModel._recordArrays.list.length, 2, 'expected the person to be a member of 2 recordArrays');
  assert.equal(filterd2Summary.called.length, 1);

  assert.equal(manager.liveRecordArrays.has(all.type), true);
  Ember.run(all, all.destroy);
  assert.equal(person._internalModel._recordArrays.list.length, 1, 'expected the person to be a member of 1 recordArrays');
  assert.equal(allSummary.called.length, 1);
  assert.equal(manager.liveRecordArrays.has(all.type), false);

  Ember.run(manager, manager.destroy);
  assert.equal(person._internalModel._recordArrays.list.length, 0, 'expected the person to be a member of no recordArrays');
  assert.equal(filterdSummary.called.length, 1);
  assert.equal(filterd2Summary.called.length, 1);
  assert.equal(allSummary.called.length, 1);
  assert.equal(adapterPopulatedSummary.called.length, 1);
});

test("Should not filter a store.peekAll() array when a record property is changed", function(assert) {
  var car;

  var populateLiveRecordArray = tap(store.recordArrayManager, 'populateLiveRecordArray');
  var updateFilterRecordArray = tap(store.recordArrayManager, 'updateFilterRecordArray');

  store.peekAll('car');

  run(function() {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper'
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
    car = store.peekRecord('car', 1);
  });

  assert.equal(populateLiveRecordArray.called.length, 1);
  assert.equal(updateFilterRecordArray.called.length, 0);

  run(function() {
    car.set('model', 'Mini');
  });

  assert.equal(populateLiveRecordArray.called.length, 1);
  assert.equal(updateFilterRecordArray.called.length, 0);

});

test('#GH-4041 store#query AdapterPopulatedRecordArrays are removed from their managers instead of retained when #destroy is called', function(assert) {
  run(() => {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'Honda',
          model: 'fit'
        }
      }
    });
  });
  const query = {};

  var adapterPopulated = manager.createAdapterPopulatedRecordArray(Car, query);

  run(() => {
    adapterPopulated.destroy();
  });

  assert.equal(manager._adapterPopulatedRecordArrays.length, 0);
});
