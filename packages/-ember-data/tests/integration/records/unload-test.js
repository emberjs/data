/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|bob|dudu)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { all, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordDataFor } from '@ember-data/store/-private';

function idsFromArr(arr) {
  return arr.map((i) => i.id);
}

const Person = Model.extend({
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
  favoriteAsyncFriends: hasMany('people', { async: false, inverse: 'favoriteFriends' }),
});
Person.reopenClass({
  toString() {
    return 'Person';
  },
});

const House = Model.extend({
  person: belongsTo('person', { async: false }),
});
House.reopenClass({
  toString() {
    return 'House';
  },
});

const Mortgage = Model.extend({
  person: belongsTo('person', { async: true }),
});
Mortgage.reopenClass({
  toString() {
    return 'Mortgage';
  },
});

const Group = Model.extend({
  people: hasMany('person', { async: false }),
});
Group.reopenClass({
  toString() {
    return 'Group';
  },
});

const Car = Model.extend({
  make: attr('string'),
  model: attr('string'),
  person: belongsTo('person', { async: false }),
});
Car.reopenClass({
  toString() {
    return 'Car';
  },
});

const Boat = Model.extend({
  name: attr('string'),
  person: belongsTo('person', { async: true }),
});
Boat.toString = function () {
  return 'Boat';
};

const Bike = Model.extend({
  name: attr(),
});
Bike.toString = function () {
  return 'Bike';
};

const Book = Model.extend({
  person: belongsTo('person', { async: true }),
});
Book.toString = function () {
  return 'Book';
};

const Spoon = Model.extend({
  person: belongsTo('person', { async: true }),
});
Spoon.toString = function () {
  return 'Spoon';
};

const Show = Model.extend({
  person: belongsTo('person', { async: false }),
});
Show.toString = function () {
  return 'Show';
};

module('integration/unload - Unloading Records', function (hooks) {
  setupTest(hooks);
  let store, adapter;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register(`model:person`, Person);
    owner.register(`model:car`, Car);
    owner.register(`model:group`, Group);
    owner.register(`model:house`, House);
    owner.register(`model:mortgage`, Mortgage);
    owner.register(`model:boat`, Boat);
    owner.register(`model:bike`, Bike);
    owner.register(`model:book`, Book);
    owner.register(`model:spoon`, Spoon);
    owner.register(`model:show`, Show);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', JSONAPISerializer.extend());

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  test('can unload a single record', function (assert) {
    let adam;
    run(function () {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
          relationships: {
            cars: {
              data: [
                {
                  id: 1,
                  type: 'car',
                },
              ],
            },
            boats: {
              data: [
                {
                  id: 2,
                  type: 'boat',
                },
              ],
            },
          },
        },
      });
      adam = store.peekRecord('person', 1);
    });

    assert.strictEqual(store.peekAll('person').get('length'), 1, 'one person record loaded');
    assert.strictEqual(store._internalModelsFor('person').length, 1, 'one person internalModel loaded');

    run(function () {
      adam.unloadRecord();
    });

    assert.strictEqual(store.peekAll('person').get('length'), 0, 'no person records');
    assert.strictEqual(store._internalModelsFor('person').length, 0, 'no person internalModels');
  });

  test('can unload all records for a given type', function (assert) {
    assert.expect(10);

    let car;
    run(function () {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Adam Sunderland',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Bob Bobson',
            },
          },
        ],
      });
      let adam = store.peekRecord('person', 1);
      let bob = store.peekRecord('person', 2);

      car = store.push({
        data: {
          type: 'car',
          id: '1',
          attributes: {
            make: 'VW',
            model: 'Beetle',
          },
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });
      bob = store.peekRecord('car', 1);
    });

    assert.strictEqual(store.peekAll('person').get('length'), 2, 'two person records loaded');
    assert.strictEqual(store._internalModelsFor('person').length, 2, 'two person internalModels loaded');
    assert.strictEqual(store.peekAll('car').get('length'), 1, 'one car record loaded');
    assert.strictEqual(store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

    run(function () {
      car.get('person');
      store.unloadAll('person');
    });

    assert.strictEqual(store.peekAll('person').get('length'), 0);
    assert.strictEqual(store.peekAll('car').get('length'), 1);
    assert.strictEqual(store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
    assert.strictEqual(store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

    run(function () {
      store.push({
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Richard II',
          },
        },
      });
    });

    car = store.peekRecord('car', 1);
    let person = car.get('person');

    assert.ok(!!car, 'We have a car');
    assert.notOk(person, 'We dont have a person');

    /*
   @runspired believes these asserts were incorrect on master.
   Basically, we intentionally treat unload on a sync belongsTo as client-side
   delete bc "bad reason" of legacy support for the mis-use of unloadRecord.
   Because of this, there should be no way to resurrect the relationship without
   receiving new relationship info which does not occur in this test.
   He checked how master manages to do this, and discovered bad things. TL;DR
   because the `person` relationship is never materialized, it's state was
   not cleared on unload, and thus the client-side delete never happened as intended.
  */
    // assert.strictEqual(person.get('id'), '1', 'Inverse can load relationship after the record is unloaded');
    // assert.strictEqual(person.get('name'), 'Richard II', 'Inverse can load relationship after the record is unloaded');
  });

  test('can unload all records', function (assert) {
    assert.expect(8);

    run(function () {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Adam Sunderland',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Bob Bobson',
            },
          },
        ],
      });
      let adam = store.peekRecord('person', 1);
      let bob = store.peekRecord('person', 2);

      store.push({
        data: {
          type: 'car',
          id: '1',
          attributes: {
            make: 'VW',
            model: 'Beetle',
          },
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });
      bob = store.peekRecord('car', 1);
    });

    assert.strictEqual(store.peekAll('person').get('length'), 2, 'two person records loaded');
    assert.strictEqual(store._internalModelsFor('person').length, 2, 'two person internalModels loaded');
    assert.strictEqual(store.peekAll('car').get('length'), 1, 'one car record loaded');
    assert.strictEqual(store._internalModelsFor('car').length, 1, 'one car internalModel loaded');

    run(function () {
      store.unloadAll();
    });

    assert.strictEqual(store.peekAll('person').get('length'), 0);
    assert.strictEqual(store.peekAll('car').get('length'), 0);
    assert.strictEqual(store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
    assert.strictEqual(store._internalModelsFor('car').length, 0, 'zero car internalModels loaded');
  });

  test('removes findAllCache after unloading all records', function (assert) {
    assert.expect(4);

    run(function () {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Adam Sunderland',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Bob Bobson',
            },
          },
        ],
      });
      let adam = store.peekRecord('person', 1);
      let bob = store.peekRecord('person', 2);
    });

    assert.strictEqual(store.peekAll('person').get('length'), 2, 'two person records loaded');
    assert.strictEqual(store._internalModelsFor('person').length, 2, 'two person internalModels loaded');

    run(function () {
      store.peekAll('person');
      store.unloadAll('person');
    });

    assert.strictEqual(store.peekAll('person').get('length'), 0, 'zero person records loaded');
    assert.strictEqual(store._internalModelsFor('person').length, 0, 'zero person internalModels loaded');
  });

  test('unloading all records also updates record array from peekAll()', function (assert) {
    run(function () {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Adam Sunderland',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Bob Bobson',
            },
          },
        ],
      });
      let adam = store.peekRecord('person', 1);
      let bob = store.peekRecord('person', 2);
    });
    let all = store.peekAll('person');

    assert.strictEqual(all.get('length'), 2);

    run(function () {
      store.unloadAll('person');
    });
    assert.strictEqual(all.get('length'), 0);
  });

  function makeBoatOneForPersonOne() {
    return {
      type: 'boat',
      id: '1',
      attributes: {
        name: 'Boaty McBoatface',
      },
      relationships: {
        person: {
          data: { type: 'person', id: '1' },
        },
      },
    };
  }

  test('unloadAll(type) does not leave stranded internalModels in relationships (rediscover via store.push)', async function (assert) {
    assert.expect(15);

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Could be Anybody',
        },
        relationships: {
          boats: {
            data: [{ type: 'boat', id: '1' }],
          },
        },
      },
      included: [makeBoatOneForPersonOne()],
    });

    let boat = store.peekRecord('boat', '1');
    let initialBoatInternalModel = boat._internalModel;
    let relationshipState = person.hasMany('boats').hasManyRelationship;
    let knownPeople = store._internalModelsFor('person');
    let knownBoats = store._internalModelsFor('boat');

    // ensure we loaded the people and boats
    assert.strictEqual(knownPeople.models.length, 1, 'one person record is loaded');
    assert.strictEqual(knownBoats.models.length, 1, 'one boat record is loaded');
    assert.true(store.hasRecordForId('person', '1'));
    assert.true(store.hasRecordForId('boat', '1'));

    // ensure the relationship was established (we reach through the async proxy here)
    let peopleBoats = await person.get('boats');
    let boatPerson = await boat.get('person');

    assert.strictEqual(relationshipState.canonicalState.length, 1, 'canonical member size should be 1');
    assert.strictEqual(relationshipState.members.size, 1, 'members size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has a boat');
    assert.strictEqual(peopleBoats.objectAt(0), boat, 'Our person has the right boat');
    assert.strictEqual(boatPerson, person, 'Our boat has the right person');

    run(() => {
      store.unloadAll('boat');
    });

    // ensure that our new state is correct
    assert.strictEqual(knownPeople.models.length, 1, 'one person record is loaded');
    assert.strictEqual(knownBoats.models.length, 0, 'no boat records are loaded');
    assert.strictEqual(relationshipState.canonicalState.length, 1, 'canonical member size should still be 1');
    assert.strictEqual(relationshipState.members.size, 1, 'members size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 0, 'Our person thinks they have no boats');

    run(() =>
      store.push({
        data: makeBoatOneForPersonOne(),
      })
    );

    let reloadedBoat = store.peekRecord('boat', '1');
    let reloadedBoatInternalModel = reloadedBoat._internalModel;

    assert.strictEqual(
      reloadedBoatInternalModel,
      initialBoatInternalModel,
      'after an unloadAll, subsequent fetch results in the same InternalModel'
    );
  });

  test('unloadAll(type) does not leave stranded internalModels in relationships (rediscover via relationship reload)', function (assert) {
    assert.expect(17);

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type.modelName, 'boat', 'We refetch the boat');
      assert.strictEqual(id, '1', 'We refetch the right boat');
      return resolve({
        data: makeBoatOneForPersonOne(),
      });
    };

    let person = run(() =>
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Could be Anybody',
          },
          relationships: {
            boats: {
              data: [{ type: 'boat', id: '1' }],
            },
          },
        },
        included: [makeBoatOneForPersonOne()],
      })
    );

    let boat = store.peekRecord('boat', '1');
    let initialBoatInternalModel = boat._internalModel;
    let relationshipState = person.hasMany('boats').hasManyRelationship;
    let knownPeople = store._internalModelsFor('person');
    let knownBoats = store._internalModelsFor('boat');

    // ensure we loaded the people and boats
    assert.strictEqual(knownPeople.models.length, 1, 'one person record is loaded');
    assert.strictEqual(knownBoats.models.length, 1, 'one boat record is loaded');
    assert.true(store.hasRecordForId('person', '1'));
    assert.true(store.hasRecordForId('boat', '1'));

    // ensure the relationship was established (we reach through the async proxy here)
    let peopleBoats = run(() => person.get('boats.content'));
    let boatPerson = run(() => boat.get('person.content'));

    assert.strictEqual(relationshipState.canonicalState.length, 1, 'canonical member size should be 1');
    assert.strictEqual(relationshipState.members.size, 1, 'members size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has a boat');
    assert.strictEqual(peopleBoats.objectAt(0), boat, 'Our person has the right boat');
    assert.strictEqual(boatPerson, person, 'Our boat has the right person');

    run(() => {
      store.unloadAll('boat');
    });

    // ensure that our new state is correct
    assert.strictEqual(knownPeople.models.length, 1, 'one person record is loaded');
    assert.strictEqual(knownBoats.models.length, 0, 'no boat records are loaded');
    assert.strictEqual(relationshipState.canonicalState.length, 1, 'canonical member size should still be 1');
    assert.strictEqual(relationshipState.members.size, 1, 'members size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 0, 'Our person thinks they have no boats');

    run(() => person.get('boats'));

    let reloadedBoat = store.peekRecord('boat', '1');
    let reloadedBoatInternalModel = reloadedBoat._internalModel;

    assert.strictEqual(
      reloadedBoatInternalModel,
      initialBoatInternalModel,
      'after an unloadAll, subsequent fetch results in the same InternalModel'
    );
  });

  test('(regression) unloadRecord followed by push in the same run-loop', function (assert) {
    let person = run(() =>
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Could be Anybody',
          },
          relationships: {
            boats: {
              data: [{ type: 'boat', id: '1' }],
            },
          },
        },
        included: [makeBoatOneForPersonOne()],
      })
    );

    let boat = store.peekRecord('boat', '1');
    let initialBoatInternalModel = boat._internalModel;
    let relationshipState = person.hasMany('boats').hasManyRelationship;
    let knownPeople = store._internalModelsFor('person');
    let knownBoats = store._internalModelsFor('boat');

    // ensure we loaded the people and boats
    assert.deepEqual(
      knownPeople.models.map((m) => m.id),
      ['1'],
      'one person record is loaded'
    );
    assert.deepEqual(
      knownBoats.models.map((m) => m.id),
      ['1'],
      'one boat record is loaded'
    );
    assert.true(store.hasRecordForId('person', '1'));
    assert.true(store.hasRecordForId('boat', '1'));

    // ensure the relationship was established (we reach through the async proxy here)
    let peopleBoats = run(() => person.get('boats.content'));
    let boatPerson = run(() => boat.get('person.content'));

    assert.deepEqual(idsFromArr(relationshipState.canonicalState), ['1'], 'canonical member size should be 1');
    assert.deepEqual(idsFromArr(relationshipState.currentState), ['1'], 'members size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has a boat');
    assert.strictEqual(peopleBoats.objectAt(0), boat, 'Our person has the right boat');
    assert.strictEqual(boatPerson, person, 'Our boat has the right person');

    run(() => boat.unloadRecord());

    // ensure that our new state is correct
    assert.deepEqual(
      knownPeople.models.map((m) => m.id),
      ['1'],
      'one person record is loaded'
    );
    assert.deepEqual(
      knownBoats.models.map((m) => m.id),
      ['1'],
      'one boat record is known'
    );
    assert.strictEqual(knownBoats.models[0], initialBoatInternalModel, 'We still have our boat');
    assert.true(initialBoatInternalModel.isEmpty, 'Model is in the empty state');
    assert.deepEqual(idsFromArr(relationshipState.canonicalState), ['1'], 'canonical member size should still be 1');
    assert.deepEqual(idsFromArr(relationshipState.currentState), ['1'], 'members size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 0, 'Our person thinks they have no boats');

    run(() =>
      store.push({
        data: makeBoatOneForPersonOne(),
      })
    );

    let reloadedBoat = store.peekRecord('boat', '1');
    let reloadedBoatInternalModel = reloadedBoat._internalModel;

    assert.deepEqual(idsFromArr(relationshipState.canonicalState), ['1'], 'canonical member size should be 1');
    assert.deepEqual(idsFromArr(relationshipState.currentState), ['1'], 'members size should be 1');
    assert.strictEqual(
      reloadedBoatInternalModel,
      initialBoatInternalModel,
      'after an unloadRecord, subsequent fetch results in the same InternalModel'
    );

    // and now the kicker, run-loop fun!
    //   here, we will dematerialize the record, but push it back into the store
    //   all in the same run-loop!
    //   effectively this tests that our destroySync is not stupid
    run(() => {
      reloadedBoat.unloadRecord();
      store.push({
        data: makeBoatOneForPersonOne(),
      });
    });

    let yaBoat = store.peekRecord('boat', '1');
    let yaBoatInternalModel = yaBoat._internalModel;

    assert.deepEqual(idsFromArr(relationshipState.canonicalState), ['1'], 'canonical member size should be 1');
    assert.deepEqual(idsFromArr(relationshipState.currentState), ['1'], 'members size should be 1');
    assert.strictEqual(
      yaBoatInternalModel,
      initialBoatInternalModel,
      'after an unloadRecord, subsequent same-loop push results in the same InternalModel'
    );
  });

  test('unloading a disconnected subgraph clears the relevant internal models', function (assert) {
    adapter.shouldBackgroundReloadRecord = () => false;

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Could be Anybody',
          },
          relationships: {
            boats: {
              data: [
                { type: 'boat', id: '1' },
                { type: 'boat', id: '2' },
              ],
            },
          },
        },
      });
    });

    run(() => {
      store.push({
        data: {
          type: 'boat',
          id: '1',
          attributes: {
            name: 'Boaty McBoatface',
          },
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });
    });

    run(() => {
      store.push({
        data: {
          type: 'boat',
          id: '2',
          attributes: {
            name: 'The jackson',
          },
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });
    });

    assert.strictEqual(store._internalModelsFor('person').models.length, 1, 'one person record is loaded');
    assert.strictEqual(store._internalModelsFor('boat').models.length, 2, 'two boat records are loaded');
    assert.true(store.hasRecordForId('person', 1));
    assert.true(store.hasRecordForId('boat', 1));
    assert.true(store.hasRecordForId('boat', 2));

    let checkOrphanCalls = 0;
    let cleanupOrphanCalls = 0;

    function countOrphanCalls(record) {
      let internalModel = record._internalModel;
      let recordData = recordDataFor(record);
      let origCheck = internalModel._checkForOrphanedInternalModels;
      let origCleanup = recordData._cleanupOrphanedRecordDatas;

      internalModel._checkForOrphanedInternalModels = function () {
        ++checkOrphanCalls;
        return origCheck.apply(record._internalModel, arguments);
      };

      recordData._cleanupOrphanedRecordDatas = function () {
        ++cleanupOrphanCalls;
        return origCleanup.apply(recordData, arguments);
      };
    }
    countOrphanCalls(store.peekRecord('person', 1));
    countOrphanCalls(store.peekRecord('boat', 1));
    countOrphanCalls(store.peekRecord('boat', 2));

    // make sure relationships are initialized
    return store
      .peekRecord('person', 1)
      .get('boats')
      .then(() => {
        run(() => {
          store.peekRecord('person', 1).unloadRecord();
          store.peekRecord('boat', 1).unloadRecord();
          store.peekRecord('boat', 2).unloadRecord();
        });

        assert.strictEqual(store._internalModelsFor('person').models.length, 0);
        assert.strictEqual(store._internalModelsFor('boat').models.length, 0);

        assert.strictEqual(checkOrphanCalls, 3, 'each internalModel checks for cleanup');
        assert.strictEqual(cleanupOrphanCalls, 3, 'each model data tries to cleanup');
      });
  });

  test('Unloading a record twice only schedules destroy once', function (assert) {
    let record;

    // populate initial record
    run(function () {
      record = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
      });
    });

    const internalModel = record._internalModel;

    run(function () {
      store.unloadRecord(record);
      store.unloadRecord(record);
      internalModel.cancelDestroy();
    });

    assert.false(internalModel.isDestroyed, 'We cancelled destroy');
  });

  test('Cancelling destroy leaves the record in the empty state', function (assert) {
    let record;

    // populate initial record
    run(function () {
      record = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
      });
    });

    const internalModel = record._internalModel;
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    run(function () {
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.false(internalModel.isDestroyed, 'the internal model is not destroyed');
      assert.true(internalModel._isDematerializing, 'the internal model is dematerializing');
      internalModel.cancelDestroy();
      assert.true(internalModel.isEmpty, 'We are unloaded after unloadRecord');
    });

    assert.false(internalModel.isDestroyed, 'the internal model was not destroyed');
    assert.false(internalModel._isDematerializing, 'the internal model is no longer dematerializing');
    assert.true(internalModel.isEmpty, 'We are still unloaded after unloadRecord');
  });

  test('after unloading a record, the record can be fetched again immediately', function (assert) {
    // stub findRecord
    adapter.findRecord = () => {
      return {
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
      };
    };

    // populate initial record
    let record = run(() => {
      return store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
          relationships: {
            cars: {
              data: [
                {
                  id: 1,
                  type: 'car',
                },
              ],
            },
          },
        },
        included: [
          {
            type: 'car',
            id: 1,
            attributes: {
              make: 'jeep',
              model: 'wrangler',
            },
          },
        ],
      });
    });

    const internalModel = record._internalModel;
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    // we test that we can sync call unloadRecord followed by findRecord
    return run(() => {
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.true(internalModel.isEmpty, 'We are unloaded after unloadRecord');
      return store.findRecord('person', '1').then((newRecord) => {
        assert.strictEqual(internalModel, newRecord._internalModel, 'the old internalModel is reused');
        assert.strictEqual(newRecord.currentState.stateName, 'root.loaded.saved', 'We are loaded after findRecord');
      });
    });
  });

  test('after unloading a record, the record can be fetched again immediately (purge relationship)', function (assert) {
    // stub findRecord
    adapter.findRecord = () => {
      return {
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
          relationships: {
            cars: {
              data: [],
            },
          },
        },
      };
    };

    // populate initial record
    let record = run(() => {
      return store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
          relationships: {
            cars: {
              data: [
                {
                  id: '1',
                  type: 'car',
                },
              ],
            },
          },
        },
        included: [
          {
            type: 'car',
            id: '1',
            attributes: {
              make: 'jeep',
              model: 'wrangler',
            },
          },
        ],
      });
    });

    const internalModel = record._internalModel;
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    // we test that we can sync call unloadRecord followed by findRecord
    return run(() => {
      assert.strictEqual(record.get('cars.firstObject.make'), 'jeep');
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.true(internalModel.isEmpty, 'Expected the previous internal model tobe unloaded');

      return store.findRecord('person', '1').then((record) => {
        assert.strictEqual(record.get('cars.length'), 0, 'Expected relationship to be cleared by the new push');
        assert.strictEqual(internalModel, record._internalModel, 'the old internalModel is reused');
        assert.strictEqual(
          record.currentState.stateName,
          'root.loaded.saved',
          'Expected the NEW internal model to be loaded'
        );
      });
    });
  });

  test('after unloading a record, the record can be fetched again immediately (with relationships)', function (assert) {
    // stub findRecord
    adapter.findRecord = () => {
      return {
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
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
              data: { type: 'bike', id: '1' },
            },
          },
        },

        included: [
          {
            id: '1',
            type: 'bike',
            attributes: {
              name: 'mr bike',
            },
          },
        ],
      });
    });

    const internalModel = record._internalModel;
    const bike = store.peekRecord('bike', '1');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    assert.strictEqual(record.get('bike.name'), 'mr bike');

    // we test that we can sync call unloadRecord followed by findRecord
    let wait = run(() => {
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.false(record.isDestroyed, 'the record is NOT YET destroyed');
      assert.true(internalModel.isEmpty, 'We are unloaded after unloadRecord');

      let wait = store.findRecord('person', '1').then((newRecord) => {
        assert.false(record.isDestroyed, 'the record is NOT YET destroyed');
        assert.strictEqual(newRecord.get('bike'), bike, 'the newRecord should retain knowledge of the bike');
      });

      assert.false(record.isDestroyed, 'the record is NOT YET destroyed');
      return wait;
    });

    assert.true(record.isDestroyed, 'the record IS destroyed');
    return wait;
  });

  test('after unloading a record, the record can be fetched again soon there after', function (assert) {
    let record;

    // stub findRecord
    adapter.findRecord = () => {
      return resolve({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
      });
    };

    // populate initial record
    run(function () {
      record = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
      });
    });

    let internalModel = record._internalModel;
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    run(function () {
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.true(internalModel.isEmpty, 'We are unloaded after unloadRecord');
    });

    run(function () {
      store.findRecord('person', '1');
    });

    record = store.peekRecord('person', '1');
    internalModel = record._internalModel;

    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded after findRecord');
  });

  test('after unloading a record, the record can be saved again immediately', function (assert) {
    assert.expect(0);

    const data = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
      },
    };

    adapter.createRecord = () => resolve(data);

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
    const personData = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
      },
    };

    function pushCar() {
      store.push({
        data: {
          type: 'car',
          id: '10',
          attributes: {
            make: 'VW',
            model: 'Beetle',
          },
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });
    }

    run(() => {
      store.push(personData);
    });

    let adam = store.peekRecord('person', 1);
    assert.strictEqual(adam.get('cars.length'), 0, 'cars hasMany starts off empty');

    run(() => pushCar());
    assert.strictEqual(adam.get('cars.length'), 1, 'pushing car setups inverse relationship');

    run(() => adam.get('cars.firstObject').unloadRecord());
    assert.strictEqual(adam.get('cars.length'), 0, 'unloading car cleaned up hasMany');

    run(() => pushCar());
    assert.strictEqual(adam.get('cars.length'), 1, 'pushing car again setups inverse relationship');
  });

  test('1:1 sync unload', function (assert) {
    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            house: {
              data: {
                id: 2,
                type: 'house',
              },
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'house',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let house = store.peekRecord('house', 2);

    assert.strictEqual(person.get('house.id'), '2', 'initially relationship established lhs');
    assert.strictEqual(house.get('person.id'), '1', 'initially relationship established rhs');

    run(() => house.unloadRecord());

    assert.strictEqual(person.get('house'), null, 'unloading acts as a delete for sync relationships');
    assert.false(store.hasRecordForId('house', 2), 'unloaded record gone from store');

    house = run(() =>
      store.push({
        data: {
          id: 2,
          type: 'house',
        },
      })
    );

    assert.true(store.hasRecordForId('house', 2), 'unloaded record can be restored');
    assert.strictEqual(person.get('house'), null, 'restoring unloaded record does not restore relationship');
    assert.strictEqual(house.get('person'), null, 'restoring unloaded record does not restore relationship');

    run(() =>
      store.push({
        data: {
          id: 2,
          type: 'house',
          relationships: {
            person: {
              data: {
                id: 1,
                type: 'person',
              },
            },
          },
        },
      })
    );

    assert.strictEqual(person.get('house.id'), '2', 'after unloading, relationship can be restored');
    assert.strictEqual(house.get('person.id'), '1', 'after unloading, relationship can be restored');
  });

  test('1:many sync unload 1 side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: 2,
                  type: 'car',
                },
                {
                  id: 3,
                  type: 'car',
                },
              ],
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'car',
          },
          {
            id: 3,
            type: 'car',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let car2 = store.peekRecord('car', 2);
    let car3 = store.peekRecord('car', 3);
    let cars = person.get('cars');

    assert.false(cars.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'initialy relationship established lhs');
    assert.strictEqual(car2.get('person.id'), '1', 'initially relationship established rhs');
    assert.strictEqual(car3.get('person.id'), '1', 'initially relationship established rhs');

    run(() => person.unloadRecord());

    assert.false(store.hasRecordForId('person', 1), 'unloaded record gone from store');

    assert.strictEqual(car2.get('person'), null, 'unloading acts as delete for sync relationships');
    assert.strictEqual(car3.get('person'), null, 'unloading acts as delete for sync relationships');
    assert.true(cars.isDestroyed, 'ManyArray destroyed');

    person = run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
        },
      })
    );

    assert.true(store.hasRecordForId('person', 1), 'unloaded record can be restored');
    assert.deepEqual(person.get('cars').mapBy('id'), [], 'restoring unloaded record does not restore relationship');
    assert.strictEqual(car2.get('person'), null, 'restoring unloaded record does not restore relationship');
    assert.strictEqual(car3.get('person'), null, 'restoring unloaded record does not restore relationship');

    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: 2,
                  type: 'car',
                },
                {
                  id: 3,
                  type: 'car',
                },
              ],
            },
          },
        },
      })
    );

    assert.strictEqual(car2.get('person.id'), '1', 'after unloading, relationship can be restored');
    assert.strictEqual(car3.get('person.id'), '1', 'after unloading, relationship can be restored');
    assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'after unloading, relationship can be restored');
  });

  test('1:many sync unload many side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: 2,
                  type: 'car',
                },
                {
                  id: 3,
                  type: 'car',
                },
              ],
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'car',
          },
          {
            id: 3,
            type: 'car',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let car2 = store.peekRecord('car', 2);
    let car3 = store.peekRecord('car', 3);
    let cars = person.get('cars');

    assert.false(cars.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'initialy relationship established lhs');
    assert.strictEqual(car2.get('person.id'), '1', 'initially relationship established rhs');
    assert.strictEqual(car3.get('person.id'), '1', 'initially relationship established rhs');

    run(() => car2.unloadRecord());

    assert.false(store.hasRecordForId('car', 2), 'unloaded record gone from store');

    assert.false(cars.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(person.get('cars').mapBy('id'), ['3'], 'unload sync relationship acts as delete');
    assert.strictEqual(car3.get('person.id'), '1', 'unloading one of a sync hasMany does not affect the rest');

    car2 = run(() =>
      store.push({
        data: {
          id: 2,
          type: 'car',
        },
      })
    );

    assert.true(store.hasRecordForId('car', 2), 'unloaded record can be restored');
    assert.deepEqual(person.get('cars').mapBy('id'), ['3'], 'restoring unloaded record does not restore relationship');
    assert.strictEqual(car2.get('person'), null, 'restoring unloaded record does not restore relationship');

    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: 2,
                  type: 'car',
                },
                {
                  id: 3,
                  type: 'car',
                },
              ],
            },
          },
        },
      })
    );

    assert.strictEqual(car2.get('person.id'), '1', 'after unloading, relationship can be restored');
    assert.deepEqual(person.get('cars').mapBy('id'), ['2', '3'], 'after unloading, relationship can be restored');
  });

  test('many:many sync unload', function (assert) {
    run(() =>
      store.push({
        data: [
          {
            id: 1,
            type: 'person',
            relationships: {
              groups: {
                data: [
                  {
                    id: 3,
                    type: 'group',
                  },
                  {
                    id: 4,
                    type: 'group',
                  },
                ],
              },
            },
          },
          {
            id: 2,
            type: 'person',
            relationships: {
              groups: {
                data: [
                  {
                    id: 3,
                    type: 'group',
                  },
                  {
                    id: 4,
                    type: 'group',
                  },
                ],
              },
            },
          },
        ],
        included: [
          {
            id: 3,
            type: 'group',
          },
          {
            id: 4,
            type: 'group',
          },
        ],
      })
    );

    let person1 = store.peekRecord('person', 1);
    let person2 = store.peekRecord('person', 2);
    let group3 = store.peekRecord('group', 3);
    let group4 = store.peekRecord('group', 4);
    let p2groups = person2.get('groups');
    let g3people = group3.get('people');

    assert.deepEqual(person1.get('groups').mapBy('id'), ['3', '4'], 'initially established relationship lhs');
    assert.deepEqual(person2.get('groups').mapBy('id'), ['3', '4'], 'initially established relationship lhs');
    assert.deepEqual(group3.get('people').mapBy('id'), ['1', '2'], 'initially established relationship lhs');
    assert.deepEqual(group4.get('people').mapBy('id'), ['1', '2'], 'initially established relationship lhs');

    assert.false(p2groups.isDestroyed, 'groups is not destroyed');
    assert.false(g3people.isDestroyed, 'people is not destroyed');

    run(() => person2.unloadRecord());

    assert.true(p2groups.isDestroyed, 'groups (unloaded side) is destroyed');
    assert.false(g3people.isDestroyed, 'people (inverse) is not destroyed');

    assert.deepEqual(
      person1.get('groups').mapBy('id'),
      ['3', '4'],
      'unloaded record in many:many does not affect inverse of inverse'
    );
    assert.deepEqual(group3.get('people').mapBy('id'), ['1'], 'unloading acts as delete for sync relationships');
    assert.deepEqual(group4.get('people').mapBy('id'), ['1'], 'unloading acts as delete for sync relationships');

    assert.false(store.hasRecordForId('person', 2), 'unloading removes record from store');

    person2 = run(() =>
      store.push({
        data: {
          id: 2,
          type: 'person',
        },
      })
    );

    assert.true(store.hasRecordForId('person', 2), 'unloaded record can be restored');
    assert.deepEqual(person2.get('groups').mapBy('id'), [], 'restoring unloaded record does not restore relationship');
    assert.deepEqual(
      group3.get('people').mapBy('id'),
      ['1'],
      'restoring unloaded record does not restore relationship'
    );
    assert.deepEqual(
      group4.get('people').mapBy('id'),
      ['1'],
      'restoring unloaded record does not restore relationship'
    );

    run(() =>
      store.push({
        data: {
          id: 2,
          type: 'person',
          relationships: {
            groups: {
              data: [
                {
                  id: 3,
                  type: 'group',
                },
                {
                  id: 4,
                  type: 'group',
                },
              ],
            },
          },
        },
      })
    );

    assert.deepEqual(person2.get('groups').mapBy('id'), ['3', '4'], 'after unloading, relationship can be restored');
    assert.deepEqual(group3.get('people').mapBy('id'), ['1', '2'], 'after unloading, relationship can be restored');
    assert.deepEqual(group4.get('people').mapBy('id'), ['1', '2'], 'after unloading, relationship can be restored');
  });

  test('1:1 async unload', function (assert) {
    let findRecordCalls = 0;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Mortgage, 'findRecord(_, type) is correct');
      assert.strictEqual(id, '2', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: 2,
          type: 'mortgage',
        },
      };
    };

    let person = run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            mortgage: {
              data: {
                id: 2,
                type: 'mortgage',
              },
            },
          },
        },
      })
    );
    let mortgage;

    return run(() =>
      person
        .get('mortgage')
        .then((asyncRecord) => {
          mortgage = asyncRecord;
          return mortgage.get('person');
        })
        .then(() => {
          assert.strictEqual(mortgage.belongsTo('person').id(), '1', 'initially relationship established lhs');
          assert.strictEqual(person.belongsTo('mortgage').id(), '2', 'initially relationship established rhs');

          run(() => mortgage.unloadRecord());

          assert.strictEqual(person.belongsTo('mortgage').id(), '2', 'unload async is not treated as delete');

          return person.get('mortgage');
        })
        .then((refetchedMortgage) => {
          assert.notEqual(mortgage, refetchedMortgage, 'the previously loaded record is not reused');

          assert.strictEqual(person.belongsTo('mortgage').id(), '2', 'unload async is not treated as delete');
          assert.strictEqual(refetchedMortgage.belongsTo('person').id(), '1', 'unload async is not treated as delete');
          assert.strictEqual(findRecordCalls, 2);
        })
    );
  });

  test('1:many async unload 1 side', function (assert) {
    let findRecordCalls = 0;
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Person, 'findRecord(_, type) is correct');
      assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: 1,
          type: 'person',
        },
      };
    };

    adapter.findMany = (store, type, ids) => {
      assert.strictEqual(type + '', Boat + '', 'findMany(_, type) is correct');
      assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
      ++findManyCalls;

      return {
        data: [
          {
            id: 2,
            type: 'boat',
          },
          {
            id: 3,
            type: 'boat',
          },
        ],
      };
    };

    let person = run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            boats: {
              data: [
                {
                  id: 2,
                  type: 'boat',
                },
                {
                  id: 3,
                  type: 'boat',
                },
              ],
            },
          },
        },
      })
    );
    let boats, boat2, boat3;

    return run(() =>
      person
        .get('boats')
        .then((asyncRecords) => {
          boats = asyncRecords;
          [boat2, boat3] = boats.toArray();
          return all([boat2, boat3].map((b) => b.get('person')));
        })
        .then(() => {
          assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established lhs');
          assert.strictEqual(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
          assert.strictEqual(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');

          assert.false(boats.isDestroyed, 'ManyArray is not destroyed');

          run(() => person.unloadRecord());

          assert.false(boats.isDestroyed, 'ManyArray is not destroyed when 1 side is unloaded');
          assert.strictEqual(boat2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
          assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

          return boat2.get('person');
        })
        .then((refetchedPerson) => {
          assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

          assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
          assert.strictEqual(boat2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
          assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

          assert.strictEqual(findManyCalls, 1, 'findMany called as expected');
          assert.strictEqual(findRecordCalls, 1, 'findRecord called as expected');
        })
    );
  });

  test('1:many async unload many side', async function (assert) {
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findMany = (store, type, ids) => {
      assert.strictEqual(type + '', Boat + '', 'findMany(_, type) is correct');
      assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
      ++findManyCalls;

      return {
        data: [
          {
            id: 2,
            type: 'boat',
          },
          {
            id: 3,
            type: 'boat',
          },
        ],
      };
    };

    let person = store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          boats: {
            data: [
              {
                id: 2,
                type: 'boat',
              },
              {
                id: 3,
                type: 'boat',
              },
            ],
          },
        },
      },
    });

    const boats = await person.boats;
    const [boat2, boat3] = boats.toArray();
    await all([boat2.person, boat3.person]);

    assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.deepEqual(boats.mapBy('id'), ['2', '3'], 'many array is initially set up correctly');

    boat2.unloadRecord();

    assert.deepEqual(boats.mapBy('id'), ['3'], 'unload async removes from previous many array');

    boat3.unloadRecord();

    assert.deepEqual(boats.mapBy('id'), [], 'unload async removes from previous many array');
    assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    const refetchedBoats = await person.boats;

    assert.strictEqual(refetchedBoats, boats, 'we have the same ManyArray');
    assert.deepEqual(refetchedBoats.mapBy('id'), ['2', '3'], 'boats refetched');
    assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    assert.strictEqual(findManyCalls, 2, 'findMany called as expected');
  });

  test('many:many async unload', async function (assert) {
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findMany = (store, type, ids) => {
      assert.strictEqual(type + '', Person + '', 'findMany(_, type) is correct');
      assert.deepEqual(ids, ['3', '4'], 'findMany(_, _, ids) is correct');
      ++findManyCalls;

      return {
        data: [
          {
            id: 3,
            type: 'person',
          },
          {
            id: 4,
            type: 'person',
          },
        ],
      };
    };

    let [person1, person2] = store.push({
      data: [
        {
          id: 1,
          type: 'person',
          relationships: {
            friends: {
              data: [
                {
                  id: 3,
                  type: 'person',
                },
                {
                  id: 4,
                  type: 'person',
                },
              ],
            },
          },
        },
        {
          id: 2,
          type: 'person',
          relationships: {
            friends: {
              data: [
                {
                  id: 3,
                  type: 'person',
                },
                {
                  id: 4,
                  type: 'person',
                },
              ],
            },
          },
        },
      ],
    });

    const person1Friends = await person1.friends;
    const [person3, person4] = person1Friends.toArray();

    await all([person2.friends, person3.friends, person4.friends]);

    assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'initially relationship established lhs');
    assert.deepEqual(person2.hasMany('friends').ids(), ['3', '4'], 'initially relationship established lhs');
    assert.deepEqual(person3.hasMany('friends').ids(), ['1', '2'], 'initially relationship established rhs');
    assert.deepEqual(person4.hasMany('friends').ids(), ['1', '2'], 'initially relationship established rhs');

    person3.unloadRecord();

    assert.deepEqual(person1Friends.mapBy('id'), ['4'], 'unload async removes from previous many array');

    person4.unloadRecord();

    assert.deepEqual(person1Friends.mapBy('id'), [], 'unload async removes from previous many array');
    assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'unload async is not treated as delete');

    const refetchedFriends = await person1.friends;

    assert.strictEqual(person1Friends, refetchedFriends, 'we have the same ManyArray');
    assert.deepEqual(refetchedFriends.mapBy('id'), ['3', '4'], 'friends refetched');
    assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'unload async is not treated as delete');

    assert.deepEqual(
      refetchedFriends.map((p) => p.hasMany('friends').ids()),
      [
        ['1', '2'],
        ['1', '2'],
      ],
      'unload async is not treated as delete'
    );

    assert.strictEqual(findManyCalls, 2, 'findMany called as expected');
  });

  test('1 sync : 1 async unload sync side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            favoriteBook: {
              data: {
                id: 2,
                type: 'book',
              },
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'book',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let book = store.peekRecord('book', 2);

    return book.get('person').then(() => {
      assert.strictEqual(person.get('favoriteBook.id'), '2', 'initially relationship established lhs');
      assert.strictEqual(book.belongsTo('person').id(), '1', 'initially relationship established rhs');

      run(() => book.unloadRecord());

      assert.strictEqual(person.get('book'), undefined, 'unloading acts as a delete for sync relationships');
      assert.false(store.hasRecordForId('book', 2), 'unloaded record gone from store');

      book = run(() =>
        store.push({
          data: {
            id: 2,
            type: 'book',
          },
        })
      );

      assert.true(store.hasRecordForId('book', 2), 'unloaded record can be restored');
      assert.strictEqual(person.get('book'), undefined, 'restoring unloaded record does not restore relationship');
      assert.strictEqual(
        book.belongsTo('person').id(),
        null,
        'restoring unloaded record does not restore relationship'
      );

      run(() =>
        store.push({
          data: {
            id: 2,
            type: 'book',
            relationships: {
              person: {
                data: {
                  id: 1,
                  type: 'person',
                },
              },
            },
          },
        })
      );

      assert.strictEqual(person.get('favoriteBook.id'), '2', 'after unloading, relationship can be restored');
      assert.strictEqual(book.get('person.id'), '1', 'after unloading, relationship can be restored');
    });
  });

  test('1 sync : 1 async unload async side', function (assert) {
    let findRecordCalls = 0;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Person, 'findRecord(_, type) is correct');
      assert.strictEqual(id, '1', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: 1,
          type: 'person',
        },
      };
    };

    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            favoriteBook: {
              data: {
                id: 2,
                type: 'book',
              },
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'book',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let book = store.peekRecord('book', 2);

    return run(() =>
      book
        .get('person')
        .then(() => {
          assert.strictEqual(person.get('favoriteBook.id'), '2', 'initially relationship established lhs');
          assert.strictEqual(book.belongsTo('person').id(), '1', 'initially relationship established rhs');

          run(() => person.unloadRecord());

          assert.strictEqual(book.belongsTo('person').id(), '1', 'unload async is not treated as delete');

          return book.get('person');
        })
        .then((refetchedPerson) => {
          assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

          assert.strictEqual(book.belongsTo('person').id(), '1', 'unload async is not treated as delete');
          assert.strictEqual(refetchedPerson.get('favoriteBook.id'), '2', 'unload async is not treated as delete');
          assert.strictEqual(findRecordCalls, 1);
        })
    );
  });

  test('1 async : many sync unload sync side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            favoriteSpoons: {
              data: [
                {
                  id: 2,
                  type: 'spoon',
                },
                {
                  id: 3,
                  type: 'spoon',
                },
              ],
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'spoon',
          },
          {
            id: 3,
            type: 'spoon',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let spoon2 = store.peekRecord('spoon', 2);
    let spoon3 = store.peekRecord('spoon', 3);
    let spoons = person.get('favoriteSpoons');

    assert.false(spoons.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'initialy relationship established lhs');
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'initially relationship established rhs');

    run(() => spoon2.unloadRecord());

    assert.false(store.hasRecordForId('spoon', 2), 'unloaded record gone from store');

    assert.false(spoons.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['3'], 'unload sync relationship acts as delete');
    assert.strictEqual(
      spoon3.belongsTo('person').id(),
      '1',
      'unloading one of a sync hasMany does not affect the rest'
    );

    spoon2 = run(() =>
      store.push({
        data: {
          id: 2,
          type: 'spoon',
        },
      })
    );

    assert.true(store.hasRecordForId('spoon', 2), 'unloaded record can be restored');
    assert.deepEqual(
      person.get('favoriteSpoons').mapBy('id'),
      ['3'],
      'restoring unloaded record does not restore relationship'
    );
    assert.strictEqual(
      spoon2.belongsTo('person').id(),
      null,
      'restoring unloaded record does not restore relationship'
    );

    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            favoriteSpoons: {
              data: [
                {
                  id: 2,
                  type: 'spoon',
                },
                {
                  id: 3,
                  type: 'spoon',
                },
              ],
            },
          },
        },
      })
    );

    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'after unloading, relationship can be restored');
    assert.deepEqual(
      person.get('favoriteSpoons').mapBy('id'),
      ['2', '3'],
      'after unloading, relationship can be restored'
    );
  });

  test('1 async : many sync unload async side', async function (assert) {
    let findRecordCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Person, 'findRecord(_, type) is correct');
      assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: 1,
          type: 'person',
        },
      };
    };

    let person = run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            favoriteSpoons: {
              data: [
                {
                  id: 2,
                  type: 'spoon',
                },
                {
                  id: 3,
                  type: 'spoon',
                },
              ],
            },
          },
        },
        included: [
          {
            id: 2,
            type: 'spoon',
          },
          {
            id: 3,
            type: 'spoon',
          },
        ],
      })
    );
    let spoon2 = store.peekRecord('spoon', 2);
    let spoon3 = store.peekRecord('spoon', 3);
    let spoons = person.get('favoriteSpoons');

    assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'initially relationship established rhs');

    assert.false(spoons.isDestroyed, 'ManyArray is not destroyed');

    run(() => person.unloadRecord());

    assert.false(spoons.isDestroyed, 'ManyArray is not destroyed when 1 side is unloaded');
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    const refetchedPerson = await spoon2.get('person');

    assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

    assert.deepEqual(person.get('favoriteSpoons').mapBy('id'), ['2', '3'], 'unload async is not treated as delete');
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    assert.strictEqual(findRecordCalls, 1, 'findRecord called as expected');
  });

  test('1 sync : many async unload async side', async function (assert) {
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findMany = (store, type, ids) => {
      assert.strictEqual(type + '', Show + '', 'findMany(_, type) is correct');
      assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
      ++findManyCalls;

      return {
        data: [
          {
            id: 2,
            type: 'show',
          },
          {
            id: 3,
            type: 'show',
          },
        ],
      };
    };

    let person = store.push({
      data: {
        id: 1,
        type: 'person',
        relationships: {
          favoriteShows: {
            data: [
              {
                id: 2,
                type: 'show',
              },
              {
                id: 3,
                type: 'show',
              },
            ],
          },
        },
      },
    });

    const shows = await person.favoriteShows;
    const [show2, show3] = shows.toArray();

    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(show2.get('person.id'), '1', 'initially relationship established rhs');
    assert.strictEqual(show3.get('person.id'), '1', 'initially relationship established rhs');
    assert.deepEqual(shows.mapBy('id'), ['2', '3'], 'many array is initially set up correctly');

    show2.unloadRecord();

    assert.deepEqual(shows.mapBy('id'), ['3'], 'unload async removes from inverse many array');

    show3.unloadRecord();

    assert.deepEqual(shows.mapBy('id'), [], 'unload async removes from inverse many array');
    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'unload async is not treated as delete');

    const refetchedShows = await person.favoriteShows;

    assert.strictEqual(shows, refetchedShows, 'we have the same ManyArray');
    assert.deepEqual(refetchedShows.mapBy('id'), ['2', '3'], 'shows refetched');
    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'unload async is not treated as delete');

    assert.strictEqual(findManyCalls, 2, 'findMany called as expected');
  });

  test('1 sync : many async unload sync side', function (assert) {
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findMany = (store, type, ids) => {
      assert.strictEqual(type + '', Show + '', 'findMany(_, type) is correct');
      assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
      ++findManyCalls;

      return {
        data: [
          {
            id: 2,
            type: 'show',
          },
          {
            id: 3,
            type: 'show',
          },
        ],
      };
    };

    let person = run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            favoriteShows: {
              data: [
                {
                  id: 2,
                  type: 'show',
                },
                {
                  id: 3,
                  type: 'show',
                },
              ],
            },
          },
        },
      })
    );

    let shows, show2, show3;

    return run(() =>
      person
        .get('favoriteShows')
        .then((asyncRecords) => {
          shows = asyncRecords;
          [show2, show3] = shows.toArray();

          assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'initially relationship established lhs');
          assert.strictEqual(show2.get('person.id'), '1', 'initially relationship established rhs');
          assert.strictEqual(show3.get('person.id'), '1', 'initially relationship established rhs');
          assert.deepEqual(shows.mapBy('id'), ['2', '3'], 'many array is initially set up correctly');

          run(() => person.unloadRecord());

          assert.false(store.hasRecordForId('person', 1), 'unloaded record gone from store');

          assert.true(shows.isDestroyed, 'previous manyarray immediately destroyed');
          assert.strictEqual(show2.get('person.id'), undefined, 'unloading acts as delete for sync relationships');
          assert.strictEqual(show3.get('person.id'), undefined, 'unloading acts as delete for sync relationships');

          person = run(() =>
            store.push({
              data: {
                id: 1,
                type: 'person',
              },
            })
          );

          assert.true(store.hasRecordForId('person', 1), 'unloaded record can be restored');
          assert.deepEqual(
            person.hasMany('favoriteShows').ids(),
            [],
            'restoring unloaded record does not restore relationship'
          );
          assert.strictEqual(
            show2.get('person.id'),
            undefined,
            'restoring unloaded record does not restore relationship'
          );
          assert.strictEqual(
            show3.get('person.id'),
            undefined,
            'restoring unloaded record does not restore relationship'
          );

          run(() =>
            store.push({
              data: {
                id: 1,
                type: 'person',
                relationships: {
                  favoriteShows: {
                    data: [
                      {
                        id: 2,
                        type: 'show',
                      },
                      {
                        id: 3,
                        type: 'show',
                      },
                    ],
                  },
                },
              },
            })
          );

          assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'relationship can be restored');

          return person.get('favoriteShows');
        })
        .then((refetchedShows) => {
          assert.notEqual(refetchedShows, shows, 'ManyArray not reused');
          assert.deepEqual(refetchedShows.mapBy('id'), ['2', '3'], 'unload async not treated as a delete');

          assert.strictEqual(findManyCalls, 1, 'findMany calls as expected');
        })
    );
  });

  test('unload invalidates link promises', function (assert) {
    let isUnloaded = false;
    adapter.coalesceFindRequests = false;

    adapter.findRecord = (/* store, type, id */) => {
      assert.notOk('Records only expected to be loaded via link');
    };

    adapter.findHasMany = (store, snapshot, link) => {
      assert.strictEqual(snapshot.modelName, 'person', 'findHasMany(_, snapshot) is correct');
      assert.strictEqual(link, 'boats', 'findHasMany(_, _, link) is correct');

      let relationships = {
        person: {
          data: {
            type: 'person',
            id: 1,
          },
        },
      };

      let data = [
        {
          id: 3,
          type: 'boat',
          relationships,
        },
      ];

      if (!isUnloaded) {
        data.unshift({
          id: 2,
          type: 'boat',
          relationships,
        });
      }

      return {
        data,
      };
    };

    let person = run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
          relationships: {
            boats: {
              links: { related: 'boats' },
            },
          },
        },
      })
    );
    let boats, boat2, boat3;

    return run(() =>
      person
        .get('boats')
        .then((asyncRecords) => {
          boats = asyncRecords;
          [boat2, boat3] = boats.toArray();
        })
        .then(() => {
          assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established rhs');
          assert.strictEqual(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
          assert.strictEqual(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');

          isUnloaded = true;
          run(() => {
            boat2.unloadRecord();
            person.get('boats');
          });

          assert.deepEqual(boats.mapBy('id'), ['3'], 'unloaded boat is removed from ManyArray');
        })
        .then(() => {
          return run(() => person.get('boats'));
        })
        .then((newBoats) => {
          assert.strictEqual(newBoats.length, 1, 'new ManyArray has only 1 boat after unload');
        })
    );
  });

  test('fetching records cancels unloading', function (assert) {
    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Person, 'findRecord(_, type) is correct');
      assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');

      return {
        data: {
          id: 1,
          type: 'person',
        },
      };
    };

    run(() =>
      store.push({
        data: {
          id: 1,
          type: 'person',
        },
      })
    );

    return run(() => store.findRecord('person', 1, { backgroundReload: true }).then((person) => person.unloadRecord()));
  });
});
