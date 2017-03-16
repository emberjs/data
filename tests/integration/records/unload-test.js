/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|bob|dudu)" }]*/

import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let attr = DS.attr;
let belongsTo = DS.belongsTo;
let hasMany = DS.hasMany;
let run = Ember.run;
let env;

let Person = DS.Model.extend({
  name: attr('string'),
  cars: hasMany('car', { async: false }),
  boats: hasMany('boat', { async: true })
});
Person.reopenClass({ toString() { return 'Person'; } });

let Group = DS.Model.extend({
  people: hasMany('person', { async: false })
});
Group.reopenClass({ toString() { return 'Group'; } });

let Car = DS.Model.extend({
  make: attr('string'),
  model: attr('string'),
  person: belongsTo('person', { async: false })
});
Car.reopenClass({ toString() { return 'Car'; } });

let Boat = DS.Model.extend({
  name: attr('string'),
  person: belongsTo('person', { async: false })
});
Boat.toString = function() { return 'Boat'; };

module("integration/unload - Unloading Records", {
  beforeEach() {
    env = setupStore({
      adapter: DS.JSONAPIAdapter,
      person: Person,
      car: Car,
      group: Group,
      boat: Boat
    });
  },

  afterEach() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test("can unload a single record", function(assert) {
  let adam;
  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        },
        relationships: {
          cars: {
            data: [{
              id: 1,
              type: 'car'
            }]
          },
          boats: {
            data: [{
              id: 2,
              type: 'boat'
            }]
          }
        }
      }
    });
    adam = env.store.peekRecord('person', 1);
  });


  assert.equal(env.store.peekAll('person').get('length'), 1, 'one person record loaded');
  assert.equal(env.store._internalModelsFor('person').length, 1, 'one person internalModel loaded');

  let relPayloads = env.store._relationshipsPayloads;

  assert.equal(relPayloads.get('person', 1, 'cars').data.length, 1, 'one car relationship payload is cached');
  assert.equal(relPayloads.get('person', 1, 'boats').data.length, 1, 'one boat relationship payload is cached');

  Ember.run(function() {
    adam.unloadRecord();
  });

  assert.equal(env.store.peekAll('person').get('length'), 0, 'no person records');
  assert.equal(env.store._internalModelsFor('person').length, 0, 'no person internalModels');

  assert.equal(relPayloads.get('person', 1, 'cars'), null, 'no car relationship payload is cached');
  assert.equal(relPayloads.get('person', 1, 'boats'), null, 'no boat relationship payload is cached');
});

test("can unload all records for a given type", function(assert) {
  assert.expect(11);

  let adam, bob, dudu;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);

    env.store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: "VW",
          model: "Beetle"
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
    dudu = bob = env.store.peekRecord('car', 1);
  });

  assert.equal(env.store.peekAll('person').get('length'), 2, 'two person records loaded');
  assert.equal(env.store._internalModelsFor('person').length, 2, 'two person internalModels loaded');
  assert.equal(env.store.peekAll('car').get('length'), 1, 'one car record loaded');
  assert.equal(env.store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

  let relPayloads = env.store._relationshipsPayloads;

  assert.equal(relPayloads.get('car', 1, 'person').data.id, 1, 'car - person payload is loaded');

  Ember.run(function() {
    env.store.unloadAll('person');
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
  assert.equal(env.store.peekAll('car').get('length'), 1);
  assert.equal(env.store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
  assert.equal(env.store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

  Ember.run(function() {
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        attributes: {
          name: 'Richard II'
        }
      }
    });
  });

  assert.equal(env.store.peekRecord('car', 1).get('person.id'), '1', 'Inverse can load relationship after the record is unloaded');
  assert.equal(env.store.peekRecord('car', 1).get('person.name'), 'Richard II', 'Inverse can load relationship after the record is unloaded');
});

test("can unload all records", function(assert) {
  assert.expect(8);

  let adam, bob, dudu;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);

    env.store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: "VW",
          model: "Beetle"
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
    dudu = bob = env.store.peekRecord('car', 1);
  });

  assert.equal(env.store.peekAll('person').get('length'), 2, 'two person records loaded');
  assert.equal(env.store._internalModelsFor('person').length, 2, 'two person internalModels loaded');
  assert.equal(env.store.peekAll('car').get('length'), 1, 'one car record loaded');
  assert.equal(env.store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

  Ember.run(function() {
    env.store.unloadAll();
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
  assert.equal(env.store.peekAll('car').get('length'), 0);
  assert.equal(env.store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
  assert.equal(env.store._internalModelsFor('car').length, 0, 'zero car internalModels loaded');
});

test("removes findAllCache after unloading all records", function(assert) {
  assert.expect(4);

  let adam, bob;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);
  });

  assert.equal(env.store.peekAll('person').get('length'), 2, 'two person records loaded');
  assert.equal(env.store._internalModelsFor('person').length, 2, 'two person internalModels loaded');

  Ember.run(function() {
    env.store.peekAll('person');
    env.store.unloadAll('person');
  });

  assert.equal(env.store.peekAll('person').get('length'), 0, 'zero person records loaded');
  assert.equal(env.store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
});

test("unloading all records also updates record array from peekAll()", function(assert) {
  let adam, bob;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);
  });
  let all = env.store.peekAll('person');

  assert.equal(all.get('length'), 2);


  Ember.run(function() {
    env.store.unloadAll('person');
  });
  assert.equal(all.get('length'), 0);
});

test('unloading a disconnected subgraph clears the relevant internal models', function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Could be Anybody'
        },
        relationships: {
          cars: {
            data: [
              { type: 'car', id: '1' },
              { type: 'car', id: '2' }
            ]
          }
        }
      }
    });
  });

  run(() => {
    env.store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'Nissan',
          model: 'Altima'
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
  });

  run(() => {
    env.store.push({
      data: {
        type: 'car',
        id: '2',
        attributes: {
          make: 'Tesla',
          model: 'S'
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
  });

  assert.equal(
    env.store._internalModelsFor('person').models.length,
    1,
    'one person record is loaded'
  );
  assert.equal(
    env.store._internalModelsFor('car').models.length,
    2,
    'two car records are loaded'
  );
  assert.equal(env.store.hasRecordForId('person', 1), true);
  assert.equal(env.store.hasRecordForId('car', 1), true);
  assert.equal(env.store.hasRecordForId('car', 2), true);

  let relPayloads = env.store._relationshipsPayloads;

  assert.equal(relPayloads.get('person', 1, 'cars').data.length, 2, 'person - cars relationship payload loaded');

  let checkOrphanCalls = 0;
  let cleanupOrphanCalls = 0;

  function countOrphanCalls(record) {
    let origCheck = record._internalModel._checkForOrphanedInternalModels;
    let origCleanup = record._internalModel._cleanupOrphanedInternalModels;

    record._internalModel._checkForOrphanedInternalModels = function () {
      ++checkOrphanCalls;
      return origCheck.apply(record._internalModel, arguments);
    };

    record._internalModel._cleanupOrphanedInternalModels = function () {
      ++cleanupOrphanCalls;
      return origCleanup.apply(record._internalModel, arguments);
    };
  }
  countOrphanCalls(env.store.peekRecord('person', 1));
  countOrphanCalls(env.store.peekRecord('car', 1));
  countOrphanCalls(env.store.peekRecord('car', 2));

  // make sure relationships are initialized
  env.store.peekRecord('person', 1).get('cars');

  run(() => {
    env.store.peekRecord('person', 1).unloadRecord();
    env.store.peekRecord('car', 1).unloadRecord();
    env.store.peekRecord('car', 2).unloadRecord();
  });

  assert.equal(env.store._internalModelsFor('person').models.length, 0);
  assert.equal(env.store._internalModelsFor('car').models.length, 0);

  assert.equal(checkOrphanCalls, 3, 'each internalModel checks for cleanup');
  assert.equal(cleanupOrphanCalls, 1, 'cleanup only happens once');

  assert.equal(relPayloads.get('person', 1, 'cars'), null, 'person - cars relationship payload unloaded');
});
