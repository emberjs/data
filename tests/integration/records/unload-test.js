/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|bob|dudu)" }]*/

import { Promise as EmberPromise } from 'rsvp';

import { run } from '@ember/runloop';

import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let attr = DS.attr;
let belongsTo = DS.belongsTo;
let hasMany = DS.hasMany;
let env;

let Person = DS.Model.extend({
  name: attr('string'),
  // 1:many sync
  cars: hasMany('car', { async: false }),
  // 1:many async
  boats: hasMany('boat', { async: true }),
  // many:many sync
  groups: hasMany('group', { async: false }),
  // many:many async
  friends: hasMany('people', { async: true }),
  // 1:1 sync inverse null
  bike: belongsTo('bike', { async: false, inverse: null }),
  // 1:1 sync
  house: belongsTo('house', { async: false }),
  // 1:1 async
  mortgage: belongsTo('mortgage', { async: true }),
  // 1 async : 1 sync
  favoriteBook: belongsTo('book', { async: false }),
  // 1 async : many sync
  favoriteSpoons: hasMany('spoon', { async: false }),
  // 1 sync: many async
  favoriteShows: hasMany('show', { async: true }),
  // many sync : many async
  favoriteFriends: hasMany('people', { async: true, inverse: 'favoriteAsyncFriends' }),
  // many async : many sync
  favoriteAsyncFriends: hasMany('people', { async: false, inverse: 'favoriteFriends' })
});
Person.reopenClass({ toString() { return 'Person'; } });

let House = DS.Model.extend({
  person: belongsTo('person', { async: false })
});
House.reopenClass({ toString() { return 'House'; } });

let Mortgage = DS.Model.extend({
  person: belongsTo('person', { async: true })
});
Mortgage.reopenClass({ toString() { return 'Mortgage'; } });

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
  person: belongsTo('person', { async: true })
});
Boat.toString = function() { return 'Boat'; };

let Bike = DS.Model.extend({
  name: DS.attr()
});
Bike.toString = function() { return 'Bike'; };

let Book = DS.Model.extend({
  person: belongsTo('person', { async: true })
});
Book.toString = function() { return 'Book'; };

let Spoon = DS.Model.extend({
  person: belongsTo('person', { async: true })
});
Spoon.toString = function() { return 'Spoon'; };

let Show = DS.Model.extend({
  person: belongsTo('person', { async: false })
});
Show.toString = function() { return 'Show'; };

module("integration/unload - Unloading Records", {
  beforeEach() {
    env = setupStore({
      adapter: DS.JSONAPIAdapter,
      person: Person,
      car: Car,
      group: Group,
      house: House,
      mortgage: Mortgage,
      boat: Boat,
      bike: Bike,
      book: Book,
      spoon: Spoon,
      show: Show
    });
  },

  afterEach() {
    run(function() {
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

  run(function() {
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

  run(function() {
    env.store.unloadAll('person');
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
  assert.equal(env.store.peekAll('car').get('length'), 1);
  assert.equal(env.store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
  assert.equal(env.store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

  run(function() {
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

  run(function() {
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

  run(function() {
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


  run(function() {
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
          boats: {
            data: [
              { type: 'boat', id: '1' },
              { type: 'boat', id: '2' }
            ]
          }
        }
      }
    });
  });

  run(() => {
    env.store.push({
      data: {
        type: 'boat',
        id: '1',
        attributes: {
          name: 'Boaty McBoatface'
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
        type: 'boat',
        id: '2',
        attributes: {
          name: 'The jackson'
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
    env.store._internalModelsFor('boat').models.length,
    2,
    'two boat records are loaded'
  );
  assert.equal(env.store.hasRecordForId('person', 1), true);
  assert.equal(env.store.hasRecordForId('boat', 1), true);
  assert.equal(env.store.hasRecordForId('boat', 2), true);

  let relPayloads = env.store._relationshipsPayloads;

  assert.equal(relPayloads.get('person', 1, 'boats').data.length, 2, 'person - boats relationship payload loaded');

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
  countOrphanCalls(env.store.peekRecord('boat', 1));
  countOrphanCalls(env.store.peekRecord('boat', 2));

  // make sure relationships are initialized
  return env.store.peekRecord('person', 1).get('boats').then(() => {
    run(() => {
      env.store.peekRecord('person', 1).unloadRecord();
      env.store.peekRecord('boat', 1).unloadRecord();
      env.store.peekRecord('boat', 2).unloadRecord();
    });

    assert.equal(env.store._internalModelsFor('person').models.length, 0);
    assert.equal(env.store._internalModelsFor('boat').models.length, 0);

    assert.equal(checkOrphanCalls, 3, 'each internalModel checks for cleanup');
    assert.equal(cleanupOrphanCalls, 1, 'cleanup only happens once');

    assert.equal(relPayloads.get('person', 1, 'boats'), null, 'person - boats relationship payload unloaded');
  });
});


test("Unloading a record twice only schedules destroy once", function(assert) {
  const store = env.store;
  let record;

  // populate initial record
  run(function() {
    record = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    });
  });

  const internalModel = record._internalModel;

  run(function() {
    store.unloadRecord(record);
    store.unloadRecord(record);
    internalModel.cancelDestroy();
  });

  assert.equal(internalModel.isDestroyed, false, 'We cancelled destroy');
});

test("Cancelling destroy leaves the record in the empty state", function(assert) {
  const store = env.store;
  let record;

  // populate initial record
  run(function() {
    record = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    });
  });

  const internalModel = record._internalModel;
  assert.equal(internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

  run(function() {
    store.unloadRecord(record);
    assert.equal(record.isDestroying, true, 'the record is destroying');
    assert.equal(internalModel.isDestroyed, false, 'the internal model is not destroyed');
    assert.equal(internalModel._isDematerializing, true, 'the internal model is dematerializing');
    internalModel.cancelDestroy();
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'We are unloaded after unloadRecord');
  });

  assert.equal(internalModel.isDestroyed, false, 'the internal model was not destroyed');
  assert.equal(internalModel._isDematerializing, false, 'the internal model is no longer dematerializing');
  assert.equal(internalModel.currentState.stateName, 'root.empty', 'We are still unloaded after unloadRecord');
});

test("after unloading a record, the record can be fetched again immediately", function(assert) {
  const store = env.store;

  // stub findRecord
  env.adapter.findRecord = () => {
    return {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    };
  };

  // populate initial record
  let record = run(() => {
    return store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        },
        relationships: {
          cars: {
            data: [
              {
                id: 1,
                type: 'car'
              }
            ]
          }
        }
      },
      included: [
        {
          type: 'car',
          id: 1,
          attributes: {
            make: 'jeep',
            model: 'wrangler'
          }
        }
      ]
    });
  });

  const internalModel = record._internalModel;
  assert.equal(internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

  // we test that we can sync call unloadRecord followed by findRecord
  return run(() => {
    store.unloadRecord(record);
    assert.equal(record.isDestroying, true, 'the record is destroying');
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'We are unloaded after unloadRecord');
    return store.findRecord('person', '1').then(newRecord => {
      assert.equal(internalModel.currentState.stateName, 'root.empty', 'the old internalModel is discarded');
      assert.equal(newRecord._internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded after findRecord');
    });
  });
});

test("after unloading a record, the record can be fetched again immediately (purge relationship)", function(assert) {
  const store = env.store;

  // stub findRecord
  env.adapter.findRecord = () => {
    return {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        },
        relationships: {
          cars: { data: null }
        }
      }
    };
  };

  // populate initial record
  let record = run(() => {
    return store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        },
        relationships: {
          cars: {
            data: [
              {
                id: 1,
                type: 'car'
              }
            ]
          }
        }
      },
      included: [
        {
          type: 'car',
          id: 1,
          attributes: {
            make: 'jeep',
            model: 'wrangler'
          }
        }
      ]
    });
  });

  const internalModel = record._internalModel;
  assert.equal(internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

  // we test that we can sync call unloadRecord followed by findRecord
  return run(() => {
    assert.equal(record.get('cars.firstObject.make'), 'jeep');
    store.unloadRecord(record);
    assert.equal(record.isDestroying, true, 'the record is destroying');
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'Expected the previous internal model tobe unloaded');

    return store.findRecord('person', '1').then(record => {
      assert.equal(record.get('cars.length'), 0);
      assert.equal(internalModel.currentState.stateName, 'root.empty', 'Expected the previous internal model to STILL be unloaded');
      assert.equal(record._internalModel.currentState.stateName, 'root.loaded.saved', 'Expected the NEW internal model to be loaded');
    });
  });
});

test("after unloading a record, the record can be fetched again immediately (with relationships)", function(assert) {
  const store = env.store;
  // stub findRecord
  env.adapter.findRecord = () => {
    return {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    };
  };

  // populate initial record
  let record = run(() => {
    return store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          bike: {
            data: { type: 'bike', id: '1' }
          }
        }
      },

      included: [
        {
          id: '1',
          type: 'bike',
          attributes: {
            name: 'mr bike'
          }
        }
      ]
    });
  });

  const internalModel = record._internalModel;
  assert.equal(internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

  assert.equal(record.get('bike.name'), 'mr bike');

  // we test that we can sync call unloadRecord followed by findRecord
  let wait = run(() => {
    store.unloadRecord(record);
    assert.equal(record.isDestroying, true, 'the record is destroying');
    assert.equal(record.isDestroyed, false, 'the record is NOT YET destroyed');
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'We are unloaded after unloadRecord');
    let wait = store.findRecord('person', '1').then(newRecord => {
      assert.equal(record.isDestroyed, false, 'the record is NOT YET destroyed');
      assert.ok(newRecord.get('bike') === null, 'the newRecord should NOT have had a bike');
    });
    assert.equal(record.isDestroyed, false, 'the record is NOT YET destroyed');
    return wait;
  });

  assert.equal(record.isDestroyed, true, 'the record IS destroyed');
  return wait;
});

test("after unloading a record, the record can be fetched again soon there after", function(assert) {
  const store = env.store;
  let record;

  // stub findRecord
  env.adapter.findRecord = () => {
    return EmberPromise.resolve({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    });
  };

  // populate initial record
  run(function() {
    record = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    });
  });

  let internalModel = record._internalModel;
  assert.equal(internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

  run(function() {
    store.unloadRecord(record);
    assert.equal(record.isDestroying, true, 'the record is destroying');
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'We are unloaded after unloadRecord');
  });

  run(function() {
    store.findRecord('person', '1');
  });

  record = store.peekRecord('person', '1');
  internalModel = record._internalModel;

  assert.equal(internalModel.currentState.stateName, 'root.loaded.saved', 'We are loaded after findRecord');
});

test('after unloading a record, the record can be saved again immediately', function (assert) {
  assert.expect(0);

  const store = env.store;
  const data = {
    data: {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Adam Sunderland'
      }
    }
  };

  env.adapter.createRecord = () => EmberPromise.resolve(data);

  run(() => {
    // add an initial record with id '1' to the store
    store.push(data);

    // unload the initial record
    store.peekRecord('person', '1').unloadRecord();

    // create a new record that will again get id '1' from the backend
    store.createRecord('person').save();
  });
});

test('after unloading a record, pushing a new copy will setup relationships', function (assert) {
  const store = env.store;
  const personData = {
    data: {
      type: 'person',
      id: '1',
      attributes: {
        name: 'Adam Sunderland'
      }
    }
  };

  function pushCar() {
    store.push({
      data: {
        type: 'car',
        id: '10',
        attributes: {
          make: 'VW',
          model: 'Beetle'
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
  }

  run(() => { store.push(personData) });

  let adam = env.store.peekRecord('person', 1);
  assert.equal(adam.get('cars.length'), 0, 'cars hasMany starts off empty');

  run(() => pushCar());
  assert.equal(adam.get('cars.length'), 1, 'pushing car setups inverse relationship');

  run(() => adam.get('cars.firstObject').unloadRecord());
  assert.equal(adam.get('cars.length'), 0, 'unloading car cleaned up hasMany');

  run(() => pushCar());
  assert.equal(adam.get('cars.length'), 1, 'pushing car again setups inverse relationship');
});

test('1:1 sync unload', function (assert) {
  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          house: {
            data: {
              id: 2,
              type: 'house'
            }
          }
        }
      },
      included: [{
        id: 2,
        type: 'house'
      }]
    })
  );

  let person = env.store.peekRecord('person', 1);
  let house = env.store.peekRecord('house', 2);

  assert.equal(person.get('house.id'), 2, 'initially relationship established lhs');
  assert.equal(house.get('person.id'), 1, 'initially relationship established rhs');

  run(() => house.unloadRecord());


  assert.equal(person.get('house'), null, 'unloading acts as a delete for sync relationships');
  assert.equal(env.store.hasRecordForId('house', 2), false, 'unloaded record gone from store');

  house = run(() =>
    env.store.push({
      data: {
        id: 2,
        type: 'house'
      }
    })
  );

  assert.equal(env.store.hasRecordForId('house', 2), true, 'unloaded record can be restored');
  assert.equal(person.get('house'), null, 'restoring unloaded record does not restore relationship');
  assert.equal(house.get('person'), null, 'restoring unloaded record does not restore relationship');

  run(() =>
    env.store.push({
      data: {
        id: 2,
        type: 'house',
        relationships: {
          person: {
            data: {
              id: 1,
              type: 'person'
            }
          }
        }
      }
    })
  );

  assert.equal(person.get('house.id'), 2, 'after unloading, relationship can be restored');
  assert.equal(house.get('person.id'), 1, 'after unloading, relationship can be restored');
});

test('1:many sync unload 1 side', function (assert) {
  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          cars: {
            data: [{
              id: 2,
              type: 'car'
            }, {
              id: 3,
              type: 'car'
            }]
          }
        }
      },
      included: [{
        id: 2,
        type: 'car'
      }, {
        id: 3,
        type: 'car'
      }]
    })
  );

  let person = env.store.peekRecord('person', 1);
  let car2 = env.store.peekRecord('car', 2);
  let car3 = env.store.peekRecord('car', 3);
  let cars = person.get('cars');

  assert.equal(cars.isDestroyed, false, 'ManyArray not destroyed');
  assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'initialy relationship established lhs');
  assert.equal(car2.get('person.id'), 1, 'initially relationship established rhs');
  assert.equal(car3.get('person.id'), 1, 'initially relationship established rhs');

  run(() => person.unloadRecord());

  assert.equal(env.store.hasRecordForId('person', 1), false, 'unloaded record gone from store');

  assert.equal(car2.get('person'), null, 'unloading acts as delete for sync relationships');
  assert.equal(car3.get('person'), null, 'unloading acts as delete for sync relationships');
  assert.equal(cars.isDestroyed, true, 'ManyArray destroyed');

  person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person'
      }
    })
  );

  assert.equal(env.store.hasRecordForId('person', 1), true, 'unloaded record can be restored');
  assert.deepEqual(person.get('cars').mapBy('id'), [], 'restoring unloaded record does not restore relationship');
  assert.equal(car2.get('person'), null, 'restoring unloaded record does not restore relationship');
  assert.equal(car3.get('person'), null, 'restoring unloaded record does not restore relationship');

  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          cars: {
            data: [{
              id: 2,
              type: 'car'
            }, {
              id: 3,
              type: 'car'
            }]
          }
        }
      }
    })
  );

  assert.equal(car2.get('person.id'), '1', 'after unloading, relationship can be restored');
  assert.equal(car3.get('person.id'), '1', 'after unloading, relationship can be restored');
  assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'after unloading, relationship can be restored');
});

test('1:many sync unload many side', function (assert) {
  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          cars: {
            data: [{
              id: 2,
              type: 'car'
            }, {
              id: 3,
              type: 'car'
            }]
          }
        }
      },
      included: [{
        id: 2,
        type: 'car'
      }, {
        id: 3,
        type: 'car'
      }]
    })
  );

  let person = env.store.peekRecord('person', 1);
  let car2 = env.store.peekRecord('car', 2);
  let car3 = env.store.peekRecord('car', 3);
  let cars = person.get('cars');

  assert.equal(cars.isDestroyed, false, 'ManyArray not destroyed');
  assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'initialy relationship established lhs');
  assert.equal(car2.get('person.id'), 1, 'initially relationship established rhs');
  assert.equal(car3.get('person.id'), 1, 'initially relationship established rhs');

  run(() => car2.unloadRecord());

  assert.equal(env.store.hasRecordForId('car', 2), false, 'unloaded record gone from store');

  assert.equal(cars.isDestroyed, false, 'ManyArray not destroyed');
  assert.deepEqual(person.get('cars').mapBy('id'), ['3'], 'unload sync relationship acts as delete');
  assert.equal(car3.get('person.id'), '1', 'unloading one of a sync hasMany does not affect the rest');

  car2 = run(() =>
    env.store.push({
      data: {
        id: 2,
        type: 'car'
      }
    })
  );

  assert.equal(env.store.hasRecordForId('car', 2), true, 'unloaded record can be restored');
  assert.deepEqual(person.get('cars').mapBy('id'), ['3'], 'restoring unloaded record does not restore relationship');
  assert.equal(car2.get('person'), null, 'restoring unloaded record does not restore relationship');

  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          cars: {
            data: [{
              id: 2,
              type: 'car'
            }, {
              id: 3,
              type: 'car'
            }]
          }
        }
      }
    })
  );

  assert.equal(car2.get('person.id'), '1', 'after unloading, relationship can be restored');
  assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'after unloading, relationship can be restored');
});

test('many:many sync unload', function (assert) {
  run(() =>
    env.store.push({
      data: [{
        id: 1,
        type: 'person',
        relationships: {
          groups: {
            data: [{
              id: 3,
              type: 'group'
            }, {
              id: 4,
              type: 'group'
            }]
          }
        }
      }, {
        id: 2,
        type: 'person',
        relationships: {
          groups: {
            data: [{
              id: 3,
              type: 'group'
            }, {
              id: 4,
              type: 'group'
            }]
          }
        }
      }],
      included: [{
        id: 3,
        type: 'group'
      }, {
        id: 4,
        type: 'group'
      }]
    })
  );

  let person1 = env.store.peekRecord('person', 1);
  let person2 = env.store.peekRecord('person', 2);
  let group3 = env.store.peekRecord('group', 3);
  let group4 = env.store.peekRecord('group', 4);
  let p2groups = person2.get('groups');
  let g3people = group3.get('people');

  assert.deepEqual(person1.get('groups').mapBy('id'), ['3', '4'], 'initially established relationship lhs');
  assert.deepEqual(person2.get('groups').mapBy('id'), ['3', '4'], 'initially established relationship lhs');
  assert.deepEqual(group3.get('people').mapBy('id'), ['1', '2'], 'initially established relationship lhs');
  assert.deepEqual(group4.get('people').mapBy('id'), ['1', '2'], 'initially established relationship lhs');

  assert.equal(p2groups.isDestroyed, false, 'groups is not destroyed');
  assert.equal(g3people.isDestroyed, false, 'people is not destroyed');

  run(() => person2.unloadRecord());

  assert.equal(p2groups.isDestroyed, true, 'groups (unloaded side) is destroyed');
  assert.equal(g3people.isDestroyed, false, 'people (inverse) is not destroyed');

  assert.deepEqual(person1.get('groups').mapBy('id'), ['3', '4'], 'unloaded record in many:many does not affect inverse of inverse');
  assert.deepEqual(group3.get('people').mapBy('id'), ['1'], 'unloading acts as delete for sync relationships');
  assert.deepEqual(group4.get('people').mapBy('id'), ['1'], 'unloading acts as delete for sync relationships');

  assert.equal(env.store.hasRecordForId('person', 2), false, 'unloading removes record from store');

  person2 = run(() =>
    env.store.push({
      data: {
        id: 2,
        type: 'person'
      }
    })
  );

  assert.equal(env.store.hasRecordForId('person', 2), true, 'unloaded record can be restored');
  assert.deepEqual(person2.get('groups').mapBy('id'), [], 'restoring unloaded record does not restore relationship');
  assert.deepEqual(group3.get('people').mapBy('id'), ['1'], 'restoring unloaded record does not restore relationship');
  assert.deepEqual(group4.get('people').mapBy('id'), ['1'], 'restoring unloaded record does not restore relationship');

  run(() =>
    env.store.push({
      data: {
        id: 2,
        type: 'person',
        relationships: {
          groups: {
            data: [{
              id: 3,
              type: 'group'
            }, {
              id: 4,
              type: 'group'
            }]
          }
        }
      }
    })
  );

  assert.deepEqual(person2.get('groups').mapBy('id'), ['3', '4'], 'after unloading, relationship can be restored');
  assert.deepEqual(group3.get('people').mapBy('id'), ['1', '2'], 'after unloading, relationship can be restored');
  assert.deepEqual(group4.get('people').mapBy('id'), ['1', '2'], 'after unloading, relationship can be restored');
});

test('1:1 async unload', function (assert) {
  let findRecordCalls = 0;

  env.adapter.findRecord = (store, type, id) => {
    assert.equal(type, Mortgage, 'findRecord(_, type) is correct');
    assert.equal(id, '2', 'findRecord(_, _, id) is correct');
    ++findRecordCalls;

    return {
      data: {
        id: 2,
        type: 'mortgage'
      }
    };
  };

  let person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          mortgage: {
            data: {
              id: 2,
              type: 'mortgage'
            }
          }
        }
      }
    })
  );
  let mortgage;

  return run(() =>
    person.get('mortgage').then((asyncRecord) => {
      mortgage = asyncRecord;
      return mortgage.get('person');
    }).then(() => {
      assert.equal(mortgage.belongsTo('person').id(), '1', 'initially relationship established lhs');
      assert.equal(person.belongsTo('mortgage').id(), '2', 'initially relationship established rhs');

      run(() => mortgage.unloadRecord());

      assert.equal(person.belongsTo('mortgage').id(), '2', 'unload async is not treated as delete');

      return person.get('mortgage');
    }).then((refetchedMortgage) => {
      assert.notEqual(mortgage, refetchedMortgage, 'the previously loaded record is not reused');

      assert.equal(person.belongsTo('mortgage').id(), '2', 'unload async is not treated as delete');
      assert.equal(refetchedMortgage.belongsTo('person').id(), '1', 'unload async is not treated as delete');
      assert.equal(findRecordCalls, 2);
    })
  );
});

test('1:many async unload 1 side', function (assert) {
  let findRecordCalls = 0;
  let findManyCalls = 0;

  env.adapter.coalesceFindRequests = true;

  env.adapter.findRecord = (store, type, id) => {
    assert.equal(type, Person, 'findRecord(_, type) is correct');
    assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');
    ++findRecordCalls;

    return {
      data: {
        id: 1,
        type: 'person'
      }
    };
  };

  env.adapter.findMany = (store, type, ids) => {
    assert.equal(type+'', Boat+'', 'findMany(_, type) is correct');
    assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
    ++findManyCalls;

    return {
      data: [{
        id: 2,
        type: 'boat'
      }, {
        id: 3,
        type: 'boat'
      }]
    };
  };

  let person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          boats: {
            data: [{
              id: 2,
              type: 'boat'
            }, {
              id: 3,
              type: 'boat'
            }]
          }
        }
      }
    })
  );
  let boats, boat2, boat3;

  return run(() =>
    person.get('boats').then((asyncRecords) => {
      boats = asyncRecords;
      [boat2, boat3] = boats.toArray();
      return EmberPromise.all([boat2, boat3].map(b => b.get('person')));
    }).then(() => {
      assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established lhs');
      assert.equal(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
      assert.equal(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');

      assert.equal(boats.isDestroyed, false, 'ManyArray is not destroyed');

      run(() => person.unloadRecord());

      assert.equal(boats.isDestroyed, false, 'ManyArray is not destroyed when 1 side is unloaded');
      assert.equal(boat2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
      assert.equal(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

      return boat2.get('person');
    }).then((refetchedPerson) => {
      assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

      assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
      assert.equal(boat2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
      assert.equal(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

      assert.equal(findManyCalls, 1, 'findMany called as expected');
      assert.equal(findRecordCalls, 1, 'findRecord called as expected');
    })
  );
});

test('1:many async unload many side', function (assert) {
  let findManyCalls = 0;

  env.adapter.coalesceFindRequests = true;

  env.adapter.findMany = (store, type, ids) => {
    assert.equal(type+'', Boat+'', 'findMany(_, type) is correct');
    assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
    ++findManyCalls;

    return {
      data: [{
        id: 2,
        type: 'boat'
      }, {
        id: 3,
        type: 'boat'
      }]
    };
  };

  let person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          boats: {
            data: [{
              id: 2,
              type: 'boat'
            }, {
              id: 3,
              type: 'boat'
            }]
          }
        }
      }
    })
  );
  let boats, boat2, boat3;

  return run(() =>
    person.get('boats').then((asyncRecords) => {
      boats = asyncRecords;
      [boat2, boat3] = boats.toArray();
      return EmberPromise.all([boat2, boat3].map(b => b.get('person')));
    }).then(() => {
      assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established lhs');
      assert.equal(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
      assert.equal(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');

      assert.deepEqual(boats.mapBy('id'), ['2', '3'], 'many array is initially set up correctly');
      run(() => boat2.unloadRecord());
      assert.deepEqual(boats.mapBy('id'), ['3'], 'unload async removes from previous many array');
      assert.equal(boats.isDestroyed, false, 'previous ManyArray not destroyed');

      run(() => boat3.unloadRecord());
      assert.deepEqual(boats.mapBy('id'), [], 'unload async removes from previous many array');
      assert.equal(boats.isDestroyed, false, 'previous ManyArray not destroyed');

      assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
      assert.equal(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

      return person.get('boats');
    }).then((refetchedBoats) => {
      assert.equal(boats.isDestroyed, false, 'previous ManyArray is not immediately destroyed after refetch');
      assert.equal(boats.isDestroying, true, 'previous ManyArray is being destroyed immediately after refetch');
      assert.deepEqual(refetchedBoats.mapBy('id'), ['2', '3'], 'boats refetched');
      assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
      assert.equal(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

      assert.equal(findManyCalls, 2, 'findMany called as expected');
    })
  ).then(() => {
    assert.equal(boats.isDestroyed, true, 'previous ManyArray is destroyed in the runloop after refetching');
  });
});

test('many:many async unload', function (assert) {
  let findManyCalls = 0;

  env.adapter.coalesceFindRequests = true;

  env.adapter.findMany = (store, type, ids) => {
    assert.equal(type+'', Person+'', 'findMany(_, type) is correct');
    assert.deepEqual(ids, ['3', '4'], 'findMany(_, _, ids) is correct');
    ++findManyCalls;

    return {
      data: [{
        id: 3,
        type: 'person'
      }, {
        id: 4,
        type: 'person'
      }]
    };
  };

  let [person1, person2] = run(() =>
    env.store.push({
      data: [{
        id: 1,
        type: 'person',
        relationships: {
          friends: {
            data: [{
              id: 3,
              type: 'person'
            }, {
              id: 4,
              type: 'person'
            }]
          }
        }
      }, {
        id: 2,
        type: 'person',
        relationships: {
          friends: {
            data: [{
              id: 3,
              type: 'person'
            }, {
              id: 4,
              type: 'person'
            }]
          }
        }
      }]
    })
  );

  let person1Friends, person3, person4;

  return run(() =>
    person1.get('friends').then((asyncRecords) => {
      person1Friends = asyncRecords;
      [person3, person4] = person1Friends.toArray();
      return EmberPromise.all([person2, person3, person4].map(b => b.get('friends')));
    }).then(() => {
      assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'initially relationship established lhs');
      assert.deepEqual(person2.hasMany('friends').ids(), ['3', '4'], 'initially relationship established lhs');
      assert.deepEqual(person3.hasMany('friends').ids(), ['1', '2'], 'initially relationship established rhs');
      assert.deepEqual(person4.hasMany('friends').ids(), ['1', '2'], 'initially relationship established rhs');

      run(() => person3.unloadRecord());
      assert.deepEqual(person1Friends.mapBy('id'), ['4'], 'unload async removes from previous many array');
      assert.equal(person1Friends.isDestroyed, false, 'previous ManyArray not destroyed');

      run(() => person4.unloadRecord());
      assert.deepEqual(person1Friends.mapBy('id'), [], 'unload async removes from previous many array');
      assert.equal(person1Friends.isDestroyed, false, 'previous ManyArray not destroyed');

      assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'unload async is not treated as delete');

      return person1.get('friends');
    }).then((refetchedFriends) => {
      assert.equal(person1Friends.isDestroyed, false, 'previous ManyArray is not immediately destroyed after refetch');
      assert.equal(person1Friends.isDestroying, true, 'previous ManyArray is being destroyed immediately after refetch');
      assert.deepEqual(refetchedFriends.mapBy('id'), ['3', '4'], 'friends refetched');
      assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'unload async is not treated as delete');

      assert.deepEqual(refetchedFriends.map(p => p.hasMany('friends').ids()), [
        ['1', '2'],
        ['1', '2']
      ], 'unload async is not treated as delete');

      assert.equal(findManyCalls, 2, 'findMany called as expected');
    })
  ).then(() => {
    assert.equal(person1Friends.isDestroyed, true, 'previous ManyArray is destroyed in the runloop after refetching');
  });
});

test('1 sync : 1 async unload sync side', function (assert) {
  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteBook: {
            data: {
              id: 2,
              type: 'book'
            }
          }
        }
      },
      included: [{
        id: 2,
        type: 'book'
      }]
    })
  );

  let person = env.store.peekRecord('person', 1);
  let book = env.store.peekRecord('book', 2);

  return book.get('person').then(() => {
    assert.equal(person.get('favoriteBook.id'), 2, 'initially relationship established lhs');
    assert.equal(book.belongsTo('person').id(), 1, 'initially relationship established rhs');

    run(() => book.unloadRecord());

    assert.equal(person.get('book'), null, 'unloading acts as a delete for sync relationships');
    assert.equal(env.store.hasRecordForId('book', 2), false, 'unloaded record gone from store');

    book = run(() =>
      env.store.push({
        data: {
          id: 2,
          type: 'book'
        }
      })
    );

    assert.equal(env.store.hasRecordForId('book', 2), true, 'unloaded record can be restored');
    assert.equal(person.get('book'), null, 'restoring unloaded record does not restore relationship');
    assert.equal(book.belongsTo('person').id(), null, 'restoring unloaded record does not restore relationship');

    run(() =>
      env.store.push({
        data: {
          id: 2,
          type: 'book',
          relationships: {
            person: {
              data: {
                id: 1,
                type: 'person'
              }
            }
          }
        }
      })
    );

    assert.equal(person.get('favoriteBook.id'), 2, 'after unloading, relationship can be restored');
    assert.equal(book.get('person.id'), 1, 'after unloading, relationship can be restored');
  });
});

test('1 sync : 1 async unload async side', function (assert) {
  let findRecordCalls = 0;

  env.adapter.findRecord = (store, type, id) => {
    assert.equal(type, Person, 'findRecord(_, type) is correct');
    assert.equal(id, '1', 'findRecord(_, _, id) is correct');
    ++findRecordCalls;

    return {
      data: {
        id: 1,
        type: 'person'
      }
    };
  };

  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteBook: {
            data: {
              id: 2,
              type: 'book'
            }
          }
        }
      },
      included: [{
        id: 2,
        type: 'book'
      }]
    })
  );

  let person = env.store.peekRecord('person', 1);
  let book = env.store.peekRecord('book', 2);

  return run(() =>
    book.get('person').then(() => {
      assert.equal(person.get('favoriteBook.id'), 2, 'initially relationship established lhs');
      assert.equal(book.belongsTo('person').id(), 1, 'initially relationship established rhs');

      run(() => person.unloadRecord());

      assert.equal(book.belongsTo('person').id(), '1', 'unload async is not treated as delete');

      return book.get('person');
    }).then((refetchedPerson) => {
      assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

      assert.equal(book.belongsTo('person').id(), '1', 'unload async is not treated as delete');
      assert.equal(refetchedPerson.get('favoriteBook.id'), '2', 'unload async is not treated as delete');
      assert.equal(findRecordCalls, 1);
    })
  );
});

test('1 async : many sync unload sync side', function (assert) {
  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteSpoons: {
            data: [{
              id: 2,
              type: 'spoon'
            }, {
              id: 3,
              type: 'spoon'
            }]
          }
        }
      },
      included: [{
        id: 2,
        type: 'spoon'
      }, {
        id: 3,
        type: 'spoon'
      }]
    })
  );

  let person = env.store.peekRecord('person', 1);
  let spoon2 = env.store.peekRecord('spoon', 2);
  let spoon3 = env.store.peekRecord('spoon', 3);
  let spoons = person.get('favoriteSpoons');

  assert.equal(spoons.isDestroyed, false, 'ManyArray not destroyed');
  assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'initialy relationship established lhs');
  assert.equal(spoon2.belongsTo('person').id(), '1', 'initially relationship established rhs');
  assert.equal(spoon3.belongsTo('person').id(), '1', 'initially relationship established rhs');

  run(() => spoon2.unloadRecord());

  assert.equal(env.store.hasRecordForId('spoon', 2), false, 'unloaded record gone from store');

  assert.equal(spoons.isDestroyed, false, 'ManyArray not destroyed');
  assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['3'], 'unload sync relationship acts as delete');
  assert.equal(spoon3.belongsTo('person').id(), '1', 'unloading one of a sync hasMany does not affect the rest');

  spoon2 = run(() =>
    env.store.push({
      data: {
        id: 2,
        type: 'spoon'
      }
    })
  );

  assert.equal(env.store.hasRecordForId('spoon', 2), true, 'unloaded record can be restored');
  assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['3'], 'restoring unloaded record does not restore relationship');
  assert.equal(spoon2.belongsTo('person').id(), null, 'restoring unloaded record does not restore relationship');

  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteSpoons: {
            data: [{
              id: 2,
              type: 'spoon'
            }, {
              id: 3,
              type: 'spoon'
            }]
          }
        }
      }
    })
  );

  assert.equal(spoon2.belongsTo('person').id(), '1', 'after unloading, relationship can be restored');
  assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'after unloading, relationship can be restored');
});

test('1 async : many sync unload async side', function (assert) {
  let findRecordCalls = 0;

  env.adapter.coalesceFindRequests = true;

  env.adapter.findRecord = (store, type, id) => {
    assert.equal(type, Person, 'findRecord(_, type) is correct');
    assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');
    ++findRecordCalls;

    return {
      data: {
        id: 1,
        type: 'person'
      }
    };
  };

  let person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteSpoons: {
            data: [
              {
                id: 2,
                type: 'spoon'
              },
              {
                id: 3,
                type: 'spoon'
              }
            ]
          }
        }
      },
      included: [
        {
          id: 2,
          type: 'spoon'
        },
        {
          id: 3,
          type: 'spoon'
        }
      ]
    })
  );
  let spoon2 = env.store.peekRecord('spoon', 2);
  let spoon3 = env.store.peekRecord('spoon', 3);
  let spoons = person.get('favoriteSpoons');

  return run(() => {
    assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'initially relationship established lhs');
    assert.equal(spoon2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.equal(spoon3.belongsTo('person').id(), '1', 'initially relationship established rhs');

    assert.equal(spoons.isDestroyed, false, 'ManyArray is not destroyed');

    run(() => person.unloadRecord());

    assert.equal(spoons.isDestroyed, false, 'ManyArray is not destroyed when 1 side is unloaded');
    assert.equal(spoon2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.equal(spoon3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    return spoon2.get('person');
  }).then((refetchedPerson) => {
    assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

    assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'unload async is not treated as delete');
    assert.equal(spoon2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.equal(spoon3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    assert.equal(findRecordCalls, 1, 'findRecord called as expected');
  });
});

test('1 sync : many async unload async side', function(assert) {
  let findManyCalls = 0;

  env.adapter.coalesceFindRequests = true;

  env.adapter.findMany = (store, type, ids) => {
    assert.equal(type+'', Show+'', 'findMany(_, type) is correct');
    assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
    ++findManyCalls;

    return {
      data: [{
        id: 2,
        type: 'show'
      }, {
        id: 3,
        type: 'show'
      }]
    };
  };

  let person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteShows: {
            data: [
              {
                id: 2,
                type: 'show'
              },
              {
                id: 3,
                type: 'show'
              }
            ]
          }
        }
      }
    })
  );

  let shows, show2, show3;

  return run(() => person.get('favoriteShows')
    .then((asyncRecords) => {
      shows = asyncRecords;
      [show2, show3] = shows.toArray();

      assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'initially relationship established lhs');
      assert.equal(show2.get('person.id'), '1', 'initially relationship established rhs');
      assert.equal(show3.get('person.id'), '1', 'initially relationship established rhs');
      assert.deepEqual(shows.mapBy('id'), ['2', '3'], 'many array is initially set up correctly');

      run(() => show2.unloadRecord());

      assert.deepEqual(shows.mapBy('id'), ['3'], 'unload async removes from previous many array');
      assert.equal(shows.isDestroyed, false, 'previous many array not destroyed');

      run(() => show3.unloadRecord());

      assert.deepEqual(shows.mapBy('id'), [], 'unload async removes from previous many array');
      assert.equal(shows.isDestroyed, false, 'previous many array not destroyed');
      assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'unload async is not treated as delete');

      return person.get('favoriteShows');
    }).then((refetchedShows) => {
      assert.equal(shows.isDestroyed, false, 'previous ManyArray is not immediately destroyed after refetch');
      assert.equal(shows.isDestroying, true, 'previous ManyArray is being destroyed immediately after refetch');
      assert.deepEqual(refetchedShows.mapBy('id'), ['2', '3'], 'shows refetched');
      assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'unload async is not treated as delete');

      assert.equal(findManyCalls, 2, 'findMany called as expected');
    })
  ).then(() => {
    assert.equal(shows.isDestroyed, true, 'previous ManyArray is destroyed in the runloop after refetching');
  });
});

test('1 sync : many async unload sync side', function(assert) {
  let findManyCalls = 0;

  env.adapter.coalesceFindRequests = true;

  env.adapter.findMany = (store, type, ids) => {
    assert.equal(type+'', Show+'', 'findMany(_, type) is correct');
    assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
    ++findManyCalls;

    return {
      data: [{
        id: 2,
        type: 'show'
      }, {
        id: 3,
        type: 'show'
      }]
    };
  };

  let person = run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteShows: {
            data: [
              {
                id: 2,
                type: 'show'
              },
              {
                id: 3,
                type: 'show'
              }
            ]
          }
        }
      }
    })
  );

  let shows, show2, show3;

  return run(() => person.get('favoriteShows')
    .then((asyncRecords) => {
      shows = asyncRecords;
      [show2, show3] = shows.toArray();

      assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'initially relationship established lhs');
      assert.equal(show2.get('person.id'), '1', 'initially relationship established rhs');
      assert.equal(show3.get('person.id'), '1', 'initially relationship established rhs');
      assert.deepEqual(shows.mapBy('id'), ['2', '3'], 'many array is initially set up correctly');

      run(() => person.unloadRecord());

      assert.equal(env.store.hasRecordForId('person', 1), false, 'unloaded record gone from store');

      assert.equal(shows.isDestroyed, true, 'previous manyarray immediately destroyed');
      assert.equal(show2.get('person.id'), null, 'unloading acts as delete for sync relationships');
      assert.equal(show3.get('person.id'), null, 'unloading acts as delete for sync relationships');

      person = run(() =>
        env.store.push({
          data: {
            id: 1,
            type: 'person'
          }
        })
      );

      assert.equal(env.store.hasRecordForId('person', 1), true, 'unloaded record can be restored');
      assert.deepEqual(person.hasMany('favoriteShows').ids(), [], 'restoring unloaded record does not restore relationship');
      assert.equal(show2.get('person.id'), null, 'restoring unloaded record does not restore relationship');
      assert.equal(show3.get('person.id'), null, 'restoring unloaded record does not restore relationship');

      run(() =>
        env.store.push({
          data: {
            id: 1,
            type: 'person',
            relationships: {
              favoriteShows: {
                data: [
                  {
                    id: 2,
                    type: 'show'
                  },
                  {
                    id: 3,
                    type: 'show'
                  }
                ]
              }
            }
          }
        })
      );

      assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'relationship can be restored');

      return person.get('favoriteShows');
    }).then((refetchedShows) => {
      assert.notEqual(refetchedShows, shows, 'ManyArray not reused');
      assert.deepEqual(refetchedShows.mapBy('id'), ['2', '3'], 'unload async not treated as a delete');

      assert.equal(findManyCalls, 1, 'findMany calls as expected');
    })
  );
});

test('fetching records cancels unloading', function(assert) {
  env.adapter.findRecord = (store, type, id) => {
    assert.equal(type, Person, 'findRecord(_, type) is correct');
    assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');

    return  {
      data: {
        id: 1,
        type: 'person'
      }
    }
  };

  run(() =>
    env.store.push({
      data: {
        id: 1,
        type: 'person'
      }
    })
  );

  return run(() =>
    env.store.findRecord('person', 1, { backgroundReload: true })
      .then(person => person.unloadRecord())
  );
});
