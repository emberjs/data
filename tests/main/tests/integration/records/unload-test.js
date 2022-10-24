/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|bob|dudu)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { all, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';

function idsFromArr(arr) {
  return arr.map((i) => i.id);
}

class Person extends Model {
  @attr('string') name;
  // 1:many sync
  @hasMany('car', { async: false, inverse: 'person' }) cars;
  // 1:many async
  @hasMany('boat', { async: true, inverse: 'person' }) boats;
  // many:many sync
  @hasMany('group', { async: false, inverse: 'people' }) groups;
  // many:many async
  @hasMany('person', { async: true, inverse: 'friends' }) friends;
  // 1:1 sync inverse null
  @belongsTo('bike', { async: false, inverse: null }) bike;
  // 1:1 sync
  @belongsTo('house', { async: false, inverse: 'person' }) house;
  // 1:1 async
  @belongsTo('mortgage', { async: true, inverse: 'person' }) mortgage;
  // 1 async : 1 sync
  @belongsTo('book', { async: false, inverse: 'person' }) favoriteBook;
  // 1 async : many sync
  @hasMany('spoon', { async: false, inverse: 'person' }) favoriteSpoons;
  // 1 sync: many async
  @hasMany('show', { async: true, inverse: 'person' }) favoriteShows;
  // many sync : many async
  @hasMany('person', { async: true, inverse: 'favoriteAsyncFriends' }) favoriteFriends;
  // many async : many sync
  @hasMany('person', { async: false, inverse: 'favoriteFriends' }) favoriteAsyncFriends;

  static toString() {
    return 'Person';
  }
}

class House extends Model {
  @belongsTo('person', { async: false, inverse: 'house' }) person;

  static toString() {
    return 'House';
  }
}

class Mortgage extends Model {
  @belongsTo('person', { async: true, inverse: 'mortgage' }) person;

  static toString() {
    return 'Mortgage';
  }
}

class Group extends Model {
  @hasMany('person', { async: false, inverse: 'groups' }) people;

  static toString() {
    return 'Group';
  }
}

class Car extends Model {
  @attr('string') make;
  @attr('string') model;
  @belongsTo('person', { async: false, inverse: 'cars' }) person;

  static toString() {
    return 'Car';
  }
}

const Boat = Model.extend({
  name: attr('string'),
  person: belongsTo('person', { async: true, inverse: 'boats' }),
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
  person: belongsTo('person', { async: true, inverse: 'favoriteBook' }),
});
Book.toString = function () {
  return 'Book';
};

const Spoon = Model.extend({
  person: belongsTo('person', { async: true, inverse: 'favoriteSpoons' }),
});
Spoon.toString = function () {
  return 'Spoon';
};

const Show = Model.extend({
  person: belongsTo('person', { async: false, inverse: 'favoriteShows' }),
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
    owner.register('serializer:application', class extends JSONAPISerializer {});

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  test('can unload a single record', async function (assert) {
    let adam = store.push({
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
          boats: {
            data: [
              {
                id: '2',
                type: 'boat',
              },
            ],
          },
        },
      },
    });

    const people = store.peekAll('person');
    assert.strictEqual(people.length, 1, 'one person record loaded in our live array');

    adam.unloadRecord();
    await settled();

    assert.strictEqual(people.length, 0, 'no person records in our live array');
    adam = store.peekRecord('person', '1');
    assert.strictEqual(adam, null, 'we have no person');
  });

  test('can unload all records for a given type', function (assert) {
    assert.expect(6);

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

    assert.strictEqual(store.peekAll('person').length, 2, 'two person records loaded');
    assert.strictEqual(store.peekAll('car').length, 1, 'one car record loaded');

    run(function () {
      car.person;
      store.unloadAll('person');
    });

    assert.strictEqual(store.peekAll('person').length, 0);
    assert.strictEqual(store.peekAll('car').length, 1);

    run(function () {
      store.push({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: 'Richard II',
          },
        },
      });
    });

    car = store.peekRecord('car', 1);
    let person = car.person;

    assert.ok(!!car, 'We have a car');
    assert.notOk(person, 'We dont have a person');
  });

  test('can unload all records', function (assert) {
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

    assert.strictEqual(store.peekAll('person').length, 2, 'two person records loaded');
    assert.strictEqual(store.peekAll('car').length, 1, 'one car record loaded');

    run(function () {
      store.unloadAll();
    });

    assert.strictEqual(store.peekAll('person').length, 0);
    assert.strictEqual(store.peekAll('car').length, 0);
  });

  test('removes findAllCache after unloading all records', function (assert) {
    assert.expect(2);

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

    assert.strictEqual(store.peekAll('person').length, 2, 'two person records loaded');

    run(function () {
      store.peekAll('person');
      store.unloadAll('person');
    });

    assert.strictEqual(store.peekAll('person').length, 0, 'zero person records loaded');
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

    assert.strictEqual(all.length, 2);

    run(function () {
      store.unloadAll('person');
    });
    assert.strictEqual(all.length, 0);
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
    assert.expect(13);

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
    let relationshipState = person.hasMany('boats').hasManyRelationship;

    // ensure we loaded the people and boats
    assert.notStrictEqual(store.peekRecord('person', '1'), null);
    assert.notStrictEqual(store.peekRecord('boat', '1'), null);

    // ensure the relationship was established (we reach through the async proxy here)
    let peopleBoats = await person.boats;
    let boatPerson = await boat.person;

    assert.strictEqual(relationshipState.remoteState.length, 1, 'remoteMembers size should be 1');
    assert.strictEqual(relationshipState.localMembers.size, 1, 'localMembers size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has a boat');
    assert.strictEqual(peopleBoats.at(0), boat, 'Our person has the right boat');
    assert.strictEqual(boatPerson, person, 'Our boat has the right person');

    run(() => {
      store.unloadAll('boat');
    });

    // ensure that our new state is correct
    assert.strictEqual(relationshipState.remoteState.length, 1, 'remoteMembers size should still be 1');
    assert.strictEqual(relationshipState.localMembers.size, 1, 'localMembers size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 0, 'Our person thinks they have no boats');

    run(() =>
      store.push({
        data: makeBoatOneForPersonOne(),
      })
    );

    store.peekRecord('boat', '1');

    // ensure that our new state is correct
    assert.strictEqual(relationshipState.remoteState.length, 1, 'remoteMembers size should still be 1');
    assert.strictEqual(relationshipState.localMembers.size, 1, 'localMembers size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has their boats');
  });

  test('unloadAll(type) does not leave stranded internalModels in relationships (rediscover via relationship reload)', function (assert) {
    assert.expect(15);

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
    let relationshipState = person.hasMany('boats').hasManyRelationship;

    // ensure we loaded the people and boats
    assert.notStrictEqual(store.peekRecord('person', '1'), null);
    assert.notStrictEqual(store.peekRecord('boat', '1'), null);

    // ensure the relationship was established (we reach through the async proxy here)
    let peopleBoats = run(() => person.boats.content);
    let boatPerson = run(() => boat.person.content);

    assert.strictEqual(relationshipState.remoteState.length, 1, 'remoteMembers size should be 1');
    assert.strictEqual(relationshipState.localMembers.size, 1, 'localMembers size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has a boat');
    assert.strictEqual(peopleBoats.at(0), boat, 'Our person has the right boat');
    assert.strictEqual(boatPerson, person, 'Our boat has the right person');

    run(() => {
      store.unloadAll('boat');
    });

    // ensure that our new state is correct
    assert.strictEqual(relationshipState.remoteState.length, 1, 'remoteMembers size should still be 1');
    assert.strictEqual(relationshipState.localMembers.size, 1, 'localMembers size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 0, 'Our person thinks they have no boats');

    run(() => person.boats);

    store.peekRecord('boat', '1');

    assert.strictEqual(relationshipState.remoteState.length, 1, 'remoteMembers size should still be 1');
    assert.strictEqual(relationshipState.localMembers.size, 1, 'localMembers size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has their boats');
  });

  test('(regression) unloadRecord followed by push in the same run-loop', async function (assert) {
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
    let relationshipState = person.hasMany('boats').hasManyRelationship;

    // ensure we loaded the people and boats
    assert.notStrictEqual(store.peekRecord('person', '1'), null);
    assert.notStrictEqual(store.peekRecord('boat', '1'), null);

    // ensure the relationship was established (we reach through the async proxy here)
    let peopleBoats = run(() => person.boats.content);
    let boatPerson = run(() => boat.person.content);

    assert.deepEqual(idsFromArr(relationshipState.remoteState), ['1'], 'remoteMembers size should be 1');
    assert.deepEqual(idsFromArr(relationshipState.localState), ['1'], 'localMembers size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person has a boat');
    assert.strictEqual(peopleBoats.at(0), boat, 'Our person has the right boat');
    assert.strictEqual(boatPerson, person, 'Our boat has the right person');

    run(() => boat.unloadRecord());

    // ensure that our new state is correct
    assert.deepEqual(idsFromArr(relationshipState.remoteState), ['1'], 'remoteMembers size should still be 1');
    assert.deepEqual(idsFromArr(relationshipState.localState), ['1'], 'localMembers size should still be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 0, 'Our person thinks they have no boats');

    run(() =>
      store.push({
        data: makeBoatOneForPersonOne(),
      })
    );

    let reloadedBoat = store.peekRecord('boat', '1');

    assert.deepEqual(idsFromArr(relationshipState.remoteState), ['1'], 'remoteMembers size should be 1');
    assert.deepEqual(idsFromArr(relationshipState.localState), ['1'], 'localMembers size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person thas their boat');

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

    boat = store.peekRecord('boat', '1');

    assert.notStrictEqual(boat, null, 'we have a boat');
    assert.deepEqual(idsFromArr(relationshipState.remoteState), ['1'], 'remoteMembers size should be 1');
    assert.deepEqual(idsFromArr(relationshipState.localState), ['1'], 'localMembers size should be 1');
    assert.strictEqual(get(peopleBoats, 'length'), 1, 'Our person thas their boat');

    // and the other way too!
    // and now the kicker, run-loop fun!
    //   here, we will dematerialize the record, but push it back into the store
    //   all in the same run-loop!
    //   effectively this tests that our destroySync is not stupid
    let newPerson;
    run(() => {
      person.unloadRecord();
      newPerson = store.push({
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
      });
    });

    const relatedPerson = await boat.person;
    assert.notStrictEqual(relatedPerson, person, 'the original record is gone');
    assert.strictEqual(relatedPerson, newPerson, 'we have a new related record');
  });

  test('after unloading a record, the record can be fetched again immediately', async function (assert) {
    let resolver;
    // stub findRecord
    adapter.findRecord = () => {
      return new Promise((resolve) => {
        resolver = resolve;
      });
    };

    // populate initial record
    let record = store.push({
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
    store.DISABLE_WAITER = true;

    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    // we test that we can sync call unloadRecord followed by findRecord
    const identifier = recordIdentifierFor(record);
    store.unloadRecord(record);
    const promise = store.findRecord('person', '1');
    assert.true(record.isDestroying, 'the record is destroying');

    await settled();
    assert.strictEqual(store.peekRecord('person', '1'), null, 'We are unloaded after unloadRecord');

    resolver({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
      },
    });
    const newRecord = await promise;
    const newIdentifier = recordIdentifierFor(newRecord);
    assert.notStrictEqual(identifier, newIdentifier, 'the identifier is not reused');
    assert.strictEqual(newRecord.currentState.stateName, 'root.loaded.saved', 'We are loaded after findRecord');
  });

  test('after unloading a record, the record can be fetched again immediately (purge relationship)', async function (assert) {
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
    let record = store.push({
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

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    // we test that we can sync call unloadRecord followed by findRecord
    assert.strictEqual(record.cars.at(0).make, 'jeep');
    store.unloadRecord(record);
    assert.true(record.isDestroying, 'the record is destroying');
    assert.true(recordData.isEmpty(identifier), 'Expected the previous data to be unloaded');

    const recordAgain = await store.findRecord('person', '1');
    assert.strictEqual(recordAgain.cars.length, 0, 'Expected relationship to be cleared by the new push');
    assert.notStrictEqual(identifier, recordIdentifierFor(recordAgain), 'the old identifier is not reused');
    assert.strictEqual(
      record.currentState.stateName,
      'root.loaded.saved',
      'Expected the NEW internal model to be loaded'
    );
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

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);
    const bike = store.peekRecord('bike', '1');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    assert.strictEqual(record.bike.name, 'mr bike');

    // we test that we can sync call unloadRecord followed by findRecord
    let wait = run(() => {
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.false(record.isDestroyed, 'the record is NOT YET destroyed');
      assert.true(recordData.isEmpty(identifier), 'We are unloaded after unloadRecord');

      let wait = store.findRecord('person', '1').then((newRecord) => {
        assert.false(record.isDestroyed, 'the record is NOT YET destroyed');
        assert.strictEqual(newRecord.bike, bike, 'the newRecord should retain knowledge of the bike');
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

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'We are loaded initially');

    run(function () {
      store.unloadRecord(record);
      assert.true(record.isDestroying, 'the record is destroying');
      assert.true(recordData.isEmpty(identifier), 'We are unloaded after unloadRecord');
    });

    run(function () {
      store.findRecord('person', '1');
    });

    record = store.peekRecord('person', '1');

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
    assert.strictEqual(adam.cars.length, 0, 'cars hasMany starts off empty');

    run(() => pushCar());
    assert.strictEqual(adam.cars.length, 1, 'pushing car setups inverse relationship');

    run(() => adam.cars.at(0).unloadRecord());
    assert.strictEqual(adam.cars.length, 0, 'unloading car cleaned up hasMany');

    run(() => pushCar());
    assert.strictEqual(adam.cars.length, 1, 'pushing car again setups inverse relationship');
  });

  test('1:1 sync unload', function (assert) {
    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            house: {
              data: {
                id: '2',
                type: 'house',
              },
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'house',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let house = store.peekRecord('house', 2);

    assert.strictEqual(person.house.id, '2', 'initially relationship established lhs');
    assert.strictEqual(house.person.id, '1', 'initially relationship established rhs');

    run(() => house.unloadRecord());

    assert.strictEqual(person.house, null, 'unloading acts as a delete for sync relationships');
    assert.strictEqual(store.peekRecord('house', '2'), null, 'unloaded record gone from store');

    house = run(() =>
      store.push({
        data: {
          id: '2',
          type: 'house',
        },
      })
    );

    assert.notStrictEqual(store.peekRecord('house', '2'), null, 'unloaded record can be restored');
    assert.strictEqual(person.house, null, 'restoring unloaded record does not restore relationship');
    assert.strictEqual(house.person, null, 'restoring unloaded record does not restore relationship');

    run(() =>
      store.push({
        data: {
          id: '2',
          type: 'house',
          relationships: {
            person: {
              data: {
                id: '1',
                type: 'person',
              },
            },
          },
        },
      })
    );

    assert.strictEqual(person.house.id, '2', 'after unloading, relationship can be restored');
    assert.strictEqual(house.person.id, '1', 'after unloading, relationship can be restored');
  });

  test('1:many sync unload 1 side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: '2',
                  type: 'car',
                },
                {
                  id: '3',
                  type: 'car',
                },
              ],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'car',
          },
          {
            id: '3',
            type: 'car',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let car2 = store.peekRecord('car', 2);
    let car3 = store.peekRecord('car', 3);
    let cars = person.cars;

    assert.false(cars.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      ['2', '3'],
      'initialy relationship established lhs'
    );
    assert.strictEqual(car2.person.id, '1', 'initially relationship established rhs');
    assert.strictEqual(car3.person.id, '1', 'initially relationship established rhs');

    run(() => person.unloadRecord());

    assert.strictEqual(store.peekRecord('person', '1'), null, 'unloaded record gone from store');

    assert.strictEqual(car2.person, null, 'unloading acts as delete for sync relationships');
    assert.strictEqual(car3.person, null, 'unloading acts as delete for sync relationships');
    assert.true(cars.isDestroyed, 'ManyArray destroyed');

    person = run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
        },
      })
    );

    assert.notStrictEqual(store.peekRecord('person', '1'), null, 'unloaded record can be restored');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      [],
      'restoring unloaded record does not restore relationship'
    );
    assert.strictEqual(car2.person, null, 'restoring unloaded record does not restore relationship');
    assert.strictEqual(car3.person, null, 'restoring unloaded record does not restore relationship');

    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: '2',
                  type: 'car',
                },
                {
                  id: '3',
                  type: 'car',
                },
              ],
            },
          },
        },
      })
    );

    assert.strictEqual(car2.person.id, '1', 'after unloading, relationship can be restored');
    assert.strictEqual(car3.person.id, '1', 'after unloading, relationship can be restored');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      ['2', '3'],
      'after unloading, relationship can be restored'
    );
  });

  test('1:many sync unload many side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: '2',
                  type: 'car',
                },
                {
                  id: '3',
                  type: 'car',
                },
              ],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'car',
          },
          {
            id: '3',
            type: 'car',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let car2 = store.peekRecord('car', 2);
    let car3 = store.peekRecord('car', 3);
    let cars = person.cars;

    assert.false(cars.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      ['2', '3'],
      'initialy relationship established lhs'
    );
    assert.strictEqual(car2.person.id, '1', 'initially relationship established rhs');
    assert.strictEqual(car3.person.id, '1', 'initially relationship established rhs');

    run(() => car2.unloadRecord());

    assert.strictEqual(store.peekRecord('car', '2'), null, 'unloaded record gone from store');

    assert.false(cars.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      ['3'],
      'unload sync relationship acts as delete'
    );
    assert.strictEqual(car3.person.id, '1', 'unloading one of a sync hasMany does not affect the rest');

    car2 = run(() =>
      store.push({
        data: {
          id: '2',
          type: 'car',
        },
      })
    );

    assert.notStrictEqual(store.peekRecord('car', '2'), null, 'unloaded record can be restored');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      ['3'],
      'restoring unloaded record does not restore relationship'
    );
    assert.strictEqual(car2.person, null, 'restoring unloaded record does not restore relationship');

    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            cars: {
              data: [
                {
                  id: '2',
                  type: 'car',
                },
                {
                  id: '3',
                  type: 'car',
                },
              ],
            },
          },
        },
      })
    );

    assert.strictEqual(car2.person.id, '1', 'after unloading, relationship can be restored');
    assert.deepEqual(
      person.cars.map((r) => r.id),
      ['2', '3'],
      'after unloading, relationship can be restored'
    );
  });

  test('many:many sync unload', function (assert) {
    run(() =>
      store.push({
        data: [
          {
            id: '1',
            type: 'person',
            relationships: {
              groups: {
                data: [
                  {
                    id: '3',
                    type: 'group',
                  },
                  {
                    id: '4',
                    type: 'group',
                  },
                ],
              },
            },
          },
          {
            id: '2',
            type: 'person',
            relationships: {
              groups: {
                data: [
                  {
                    id: '3',
                    type: 'group',
                  },
                  {
                    id: '4',
                    type: 'group',
                  },
                ],
              },
            },
          },
        ],
        included: [
          {
            id: '3',
            type: 'group',
          },
          {
            id: '4',
            type: 'group',
          },
        ],
      })
    );

    let person1 = store.peekRecord('person', 1);
    let person2 = store.peekRecord('person', 2);
    let group3 = store.peekRecord('group', 3);
    let group4 = store.peekRecord('group', 4);
    let p2groups = person2.groups;
    let g3people = group3.people;

    assert.deepEqual(
      person1.groups.map((r) => r.id),
      ['3', '4'],
      'initially established relationship lhs'
    );
    assert.deepEqual(
      person2.groups.map((r) => r.id),
      ['3', '4'],
      'initially established relationship lhs'
    );
    assert.deepEqual(
      group3.people.map((r) => r.id),
      ['1', '2'],
      'initially established relationship lhs'
    );
    assert.deepEqual(
      group4.people.map((r) => r.id),
      ['1', '2'],
      'initially established relationship lhs'
    );

    assert.false(p2groups.isDestroyed, 'groups is not destroyed');
    assert.false(g3people.isDestroyed, 'people is not destroyed');

    run(() => person2.unloadRecord());

    assert.true(p2groups.isDestroyed, 'groups (unloaded side) is destroyed');
    assert.false(g3people.isDestroyed, 'people (inverse) is not destroyed');

    assert.deepEqual(
      person1.groups.map((r) => r.id),
      ['3', '4'],
      'unloaded record in many:many does not affect inverse of inverse'
    );
    assert.deepEqual(
      group3.people.map((r) => r.id),
      ['1'],
      'unloading acts as delete for sync relationships'
    );
    assert.deepEqual(
      group4.people.map((r) => r.id),
      ['1'],
      'unloading acts as delete for sync relationships'
    );

    assert.strictEqual(store.peekRecord('person', '2'), null, 'unloading removes record from store');

    person2 = run(() =>
      store.push({
        data: {
          id: '2',
          type: 'person',
        },
      })
    );

    assert.notStrictEqual(store.peekRecord('person', '2'), null, 'unloaded record can be restored');
    assert.deepEqual(
      person2.groups.map((r) => r.id),
      [],
      'restoring unloaded record does not restore relationship'
    );
    assert.deepEqual(
      group3.people.map((r) => r.id),
      ['1'],
      'restoring unloaded record does not restore relationship'
    );
    assert.deepEqual(
      group4.people.map((r) => r.id),
      ['1'],
      'restoring unloaded record does not restore relationship'
    );

    run(() =>
      store.push({
        data: {
          id: '2',
          type: 'person',
          relationships: {
            groups: {
              data: [
                {
                  id: '3',
                  type: 'group',
                },
                {
                  id: '4',
                  type: 'group',
                },
              ],
            },
          },
        },
      })
    );

    assert.deepEqual(
      person2.groups.map((r) => r.id),
      ['3', '4'],
      'after unloading, relationship can be restored'
    );
    assert.deepEqual(
      group3.people.map((r) => r.id),
      ['1', '2'],
      'after unloading, relationship can be restored'
    );
    assert.deepEqual(
      group4.people.map((r) => r.id),
      ['1', '2'],
      'after unloading, relationship can be restored'
    );
  });

  test('1:1 async unload', function (assert) {
    let findRecordCalls = 0;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Mortgage, 'findRecord(_, type) is correct');
      assert.strictEqual(id, '2', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: '2',
          type: 'mortgage',
        },
      };
    };

    let person = run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            mortgage: {
              data: {
                id: '2',
                type: 'mortgage',
              },
            },
          },
        },
      })
    );
    let mortgage;

    return run(() =>
      person.mortgage
        .then((asyncRecord) => {
          mortgage = asyncRecord;
          return mortgage.person;
        })
        .then(() => {
          assert.strictEqual(mortgage.belongsTo('person').id(), '1', 'initially relationship established lhs');
          assert.strictEqual(person.belongsTo('mortgage').id(), '2', 'initially relationship established rhs');

          run(() => mortgage.unloadRecord());

          assert.strictEqual(person.belongsTo('mortgage').id(), '2', 'unload async is not treated as delete');

          return person.mortgage;
        })
        .then((refetchedMortgage) => {
          assert.notEqual(mortgage, refetchedMortgage, 'the previously loaded record is not reused');

          assert.strictEqual(person.belongsTo('mortgage').id(), '2', 'unload async is not treated as delete');
          assert.strictEqual(refetchedMortgage.belongsTo('person').id(), '1', 'unload async is not treated as delete');
          assert.strictEqual(findRecordCalls, 2);
        })
    );
  });

  test('1:many async unload 1 side', async function (assert) {
    let findRecordCalls = 0;
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Person, 'findRecord(_, type) is correct');
      assert.deepEqual(id, '1', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: '1',
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
            id: '2',
            type: 'boat',
          },
          {
            id: '3',
            type: 'boat',
          },
        ],
      };
    };

    let person = store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          boats: {
            data: [
              {
                id: '2',
                type: 'boat',
              },
              {
                id: '3',
                type: 'boat',
              },
            ],
          },
        },
      },
    });
    let boats, boat2, boat3;

    const asyncRecords = await person.boats;
    boats = asyncRecords;
    [boat2, boat3] = boats.slice();
    await Promise.all([boat2, boat3].map((b) => b.person));

    assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');

    assert.false(boats.isDestroyed, 'ManyArray is not destroyed');

    run(() => person.unloadRecord());

    assert.true(boats.isDestroyed, 'ManyArray is destroyed when 1 side is unloaded');
    assert.strictEqual(boat2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    const refetchedPerson = await boat2.person;

    assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

    assert.deepEqual(refetchedPerson.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');
    assert.strictEqual(boat2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    assert.strictEqual(findManyCalls, 1, 'findMany called as expected');
    assert.strictEqual(findRecordCalls, 1, 'findRecord called as expected');
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
            id: '2',
            type: 'boat',
          },
          {
            id: '3',
            type: 'boat',
          },
        ],
      };
    };

    let person = store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          boats: {
            data: [
              {
                id: '2',
                type: 'boat',
              },
              {
                id: '3',
                type: 'boat',
              },
            ],
          },
        },
      },
    });

    const boats = await person.boats;

    let [boat2, boat3] = boats.slice();
    await Promise.all([boat2.person, boat3.person]);

    assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.deepEqual(
      boats.map((r) => r.id),
      ['2', '3'],
      'many array is initially set up correctly'
    );

    boat2.unloadRecord();

    assert.deepEqual(
      boats.map((r) => r.id),
      ['3'],
      'unload async removes from previous many array'
    );

    boat3.unloadRecord();

    assert.deepEqual(
      boats.map((r) => r.id),
      [],
      'unload async removes from previous many array'
    );
    assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'unload async is not treated as delete');

    boat3 = store.push({
      data: {
        type: 'boat',
        id: '3',
      },
    });

    assert.strictEqual(boat3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    boat3.unloadRecord();

    const refetchedBoats = await person.boats;

    boat3 = store.peekRecord('boat', '3');
    assert.strictEqual(refetchedBoats, boats, 'we have the same ManyArray');
    assert.deepEqual(
      refetchedBoats.map((r) => r.id),
      ['2', '3'],
      'boats refetched'
    );
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
            id: '3',
            type: 'person',
          },
          {
            id: '4',
            type: 'person',
          },
        ],
      };
    };

    let [person1, person2] = store.push({
      data: [
        {
          id: '1',
          type: 'person',
          relationships: {
            friends: {
              data: [
                {
                  id: '3',
                  type: 'person',
                },
                {
                  id: '4',
                  type: 'person',
                },
              ],
            },
          },
        },
        {
          id: '2',
          type: 'person',
          relationships: {
            friends: {
              data: [
                {
                  id: '3',
                  type: 'person',
                },
                {
                  id: '4',
                  type: 'person',
                },
              ],
            },
          },
        },
      ],
    });

    const person1Friends = await person1.friends;
    const [person3, person4] = person1Friends.slice();

    await all([person2.friends, person3.friends, person4.friends]);

    assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'initially relationship established lhs');
    assert.deepEqual(person2.hasMany('friends').ids(), ['3', '4'], 'initially relationship established lhs');
    assert.deepEqual(person3.hasMany('friends').ids(), ['1', '2'], 'initially relationship established rhs');
    assert.deepEqual(person4.hasMany('friends').ids(), ['1', '2'], 'initially relationship established rhs');

    person3.unloadRecord();

    assert.deepEqual(
      person1Friends.map((r) => r.id),
      ['4'],
      'unload async removes from previous many array'
    );

    person4.unloadRecord();

    assert.deepEqual(
      person1Friends.map((r) => r.id),
      [],
      'unload async removes from previous many array'
    );
    assert.deepEqual(person1.hasMany('friends').ids(), ['3', '4'], 'unload async is not treated as delete');

    const refetchedFriends = await person1.friends;

    assert.strictEqual(person1Friends, refetchedFriends, 'we have the same ManyArray');
    assert.deepEqual(
      refetchedFriends.map((r) => r.id),
      ['3', '4'],
      'friends refetched'
    );
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

  test('1 sync : 1 async unload sync side', async function (assert) {
    let person = store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          favoriteBook: {
            data: {
              id: '2',
              type: 'book',
            },
          },
        },
      },
      included: [
        {
          id: '2',
          type: 'book',
        },
      ],
    });

    let book = store.peekRecord('book', '2');
    await book.person;

    assert.strictEqual(person.favoriteBook.id, '2', 'initially relationship established lhs');
    assert.strictEqual(book.belongsTo('person').id(), '1', 'initially relationship established rhs');

    book.unloadRecord();
    await settled();

    assert.strictEqual(person.book, undefined, 'unloading acts as a delete for sync relationships');
    assert.strictEqual(store.peekRecord('book', '2'), null, 'unloaded record gone from store');

    store.push({
      data: {
        id: '2',
        type: 'book',
      },
    });

    book = store.peekRecord('book', '2');
    assert.notStrictEqual(book, null, 'unloaded record can be restored');
    assert.strictEqual(person.book, undefined, 'restoring unloaded record does not restore relationship');
    assert.strictEqual(book.belongsTo('person').id(), null, 'restoring unloaded record does not restore relationship');

    store.push({
      data: {
        id: '2',
        type: 'book',
        relationships: {
          person: {
            data: {
              id: '1',
              type: 'person',
            },
          },
        },
      },
    });

    const bookPerson = await book.person;
    assert.strictEqual(person.favoriteBook.id, '2', 'after unloading, relationship can be restored');
    assert.strictEqual(bookPerson?.id, '1', 'after unloading, relationship can be restored');
  });

  test('1 sync : 1 async unload async side', function (assert) {
    let findRecordCalls = 0;

    adapter.findRecord = (store, type, id) => {
      assert.strictEqual(type, Person, 'findRecord(_, type) is correct');
      assert.strictEqual(id, '1', 'findRecord(_, _, id) is correct');
      ++findRecordCalls;

      return {
        data: {
          id: '1',
          type: 'person',
        },
      };
    };

    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            favoriteBook: {
              data: {
                id: '2',
                type: 'book',
              },
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'book',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let book = store.peekRecord('book', 2);

    return run(() =>
      book.person
        .then(() => {
          assert.strictEqual(person.favoriteBook.id, '2', 'initially relationship established lhs');
          assert.strictEqual(book.belongsTo('person').id(), '1', 'initially relationship established rhs');

          run(() => person.unloadRecord());

          assert.strictEqual(book.belongsTo('person').id(), '1', 'unload async is not treated as delete');

          return book.person;
        })
        .then((refetchedPerson) => {
          assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

          assert.strictEqual(book.belongsTo('person').id(), '1', 'unload async is not treated as delete');
          assert.strictEqual(refetchedPerson.favoriteBook.id, '2', 'unload async is not treated as delete');
          assert.strictEqual(findRecordCalls, 1);
        })
    );
  });

  test('1 async : many sync unload sync side', function (assert) {
    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
          relationships: {
            favoriteSpoons: {
              data: [
                {
                  id: '2',
                  type: 'spoon',
                },
                {
                  id: '3',
                  type: 'spoon',
                },
              ],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'spoon',
          },
          {
            id: '3',
            type: 'spoon',
          },
        ],
      })
    );

    let person = store.peekRecord('person', 1);
    let spoon2 = store.peekRecord('spoon', 2);
    let spoon3 = store.peekRecord('spoon', 3);
    let spoons = person.favoriteSpoons;

    assert.false(spoons.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(
      person.favoriteSpoons.map((r) => r.id),
      ['2', '3'],
      'initialy relationship established lhs'
    );
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'initially relationship established rhs');

    run(() => spoon2.unloadRecord());

    assert.strictEqual(store.peekRecord('spoon', '2'), null, 'unloaded record gone from store');

    assert.false(spoons.isDestroyed, 'ManyArray not destroyed');
    assert.deepEqual(
      person.favoriteSpoons.map((r) => r.id),
      ['3'],
      'unload sync relationship acts as delete'
    );
    assert.strictEqual(
      spoon3.belongsTo('person').id(),
      '1',
      'unloading one of a sync hasMany does not affect the rest'
    );

    spoon2 = run(() =>
      store.push({
        data: {
          id: '2',
          type: 'spoon',
        },
      })
    );

    assert.notStrictEqual(store.peekRecord('spoon', '2'), null, 'unloaded record can be restored');
    assert.deepEqual(
      person.favoriteSpoons.map((r) => r.id),
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
          id: '1',
          type: 'person',
          relationships: {
            favoriteSpoons: {
              data: [
                {
                  id: '2',
                  type: 'spoon',
                },
                {
                  id: '3',
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
      person.favoriteSpoons.map((r) => r.id),
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
          id: '1',
          type: 'person',
        },
      };
    };

    let person = store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          favoriteSpoons: {
            data: [
              {
                id: '2',
                type: 'spoon',
              },
              {
                id: '3',
                type: 'spoon',
              },
            ],
          },
        },
      },
      included: [
        {
          id: '2',
          type: 'spoon',
        },
        {
          id: '3',
          type: 'spoon',
        },
      ],
    });
    let spoon2 = store.peekRecord('spoon', '2');
    let spoon3 = store.peekRecord('spoon', '3');
    let spoons = person.favoriteSpoons;

    assert.deepEqual(
      person.favoriteSpoons.map((r) => r.id),
      ['2', '3'],
      'initially relationship established lhs'
    );
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'initially relationship established rhs');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'initially relationship established rhs');

    assert.false(spoons.isDestroyed, 'ManyArray is not destroyed');

    person.unloadRecord();
    await settled();

    assert.true(spoons.isDestroyed, 'ManyArray is destroyed when 1 side is unloaded');
    assert.strictEqual(spoon2.belongsTo('person').id(), '1', 'unload async is not treated as delete');
    assert.strictEqual(spoon3.belongsTo('person').id(), '1', 'unload async is not treated as delete');

    const refetchedPerson = await spoon2.person;

    assert.notEqual(person, refetchedPerson, 'the previously loaded record is not reused');

    assert.deepEqual(
      refetchedPerson.favoriteSpoons.map((r) => r.id),
      ['2', '3'],
      'unload async is not treated as delete'
    );
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
            id: '2',
            type: 'show',
          },
          {
            id: '3',
            type: 'show',
          },
        ],
      };
    };

    let person = store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          favoriteShows: {
            data: [
              {
                id: '2',
                type: 'show',
              },
              {
                id: '3',
                type: 'show',
              },
            ],
          },
        },
      },
    });

    const shows = await person.favoriteShows;
    const [show2, show3] = shows.slice();

    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(show2.person.id, '1', 'initially relationship established rhs');
    assert.strictEqual(show3.person.id, '1', 'initially relationship established rhs');
    assert.deepEqual(
      shows.map((r) => r.id),
      ['2', '3'],
      'many array is initially set up correctly'
    );

    show2.unloadRecord();

    assert.deepEqual(
      shows.map((r) => r.id),
      ['3'],
      'unload async removes from inverse many array'
    );

    show3.unloadRecord();

    assert.deepEqual(
      shows.map((r) => r.id),
      [],
      'unload async removes from inverse many array'
    );
    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'unload async is not treated as delete');

    const refetchedShows = await person.favoriteShows;

    assert.strictEqual(shows, refetchedShows, 'we have the same ManyArray');
    assert.deepEqual(
      refetchedShows.map((r) => r.id),
      ['2', '3'],
      'shows refetched'
    );
    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'unload async is not treated as delete');

    assert.strictEqual(findManyCalls, 2, 'findMany called as expected');
  });

  test('1 sync : many async unload sync side', async function (assert) {
    let findManyCalls = 0;

    adapter.coalesceFindRequests = true;

    adapter.findMany = (store, type, ids) => {
      assert.strictEqual(type + '', Show + '', 'findMany(_, type) is correct');
      assert.deepEqual(ids, ['2', '3'], 'findMany(_, _, ids) is correct');
      ++findManyCalls;

      return {
        data: [
          {
            id: '2',
            type: 'show',
          },
          {
            id: '3',
            type: 'show',
          },
        ],
      };
    };

    let person = store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          favoriteShows: {
            data: [
              {
                id: '2',
                type: 'show',
              },
              {
                id: '3',
                type: 'show',
              },
            ],
          },
        },
      },
    });
    let shows, show2, show3;

    const asyncRecords = await person.favoriteShows;
    shows = asyncRecords;
    [show2, show3] = shows.slice();

    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'initially relationship established lhs');
    assert.strictEqual(show2.person.id, '1', 'initially relationship established rhs');
    assert.strictEqual(show3.person.id, '1', 'initially relationship established rhs');
    assert.deepEqual(
      shows.map((r) => r.id),
      ['2', '3'],
      'many array is initially set up correctly'
    );

    person.unloadRecord();
    await settled();

    assert.strictEqual(store.peekRecord('person', '1'), null, 'unloaded record gone from store');

    assert.true(shows.isDestroyed, 'previous manyarray immediately destroyed');
    assert.strictEqual(show2.person?.id, undefined, 'unloading acts as delete for sync relationships');
    assert.strictEqual(show3.person?.id, undefined, 'unloading acts as delete for sync relationships');

    person = store.push({
      data: {
        id: '1',
        type: 'person',
      },
    });

    assert.notStrictEqual(store.peekRecord('person', '1'), null, 'unloaded record can be restored');
    assert.deepEqual(
      person.hasMany('favoriteShows').ids(),
      [],
      'restoring unloaded record does not restore relationship'
    );
    assert.strictEqual(show2.person?.id, undefined, 'restoring unloaded record does not restore relationship');
    assert.strictEqual(show3.person?.id, undefined, 'restoring unloaded record does not restore relationship');

    store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          favoriteShows: {
            data: [
              {
                id: '2',
                type: 'show',
              },
              {
                id: '3',
                type: 'show',
              },
            ],
          },
        },
      },
    });

    assert.deepEqual(person.hasMany('favoriteShows').ids(), ['2', '3'], 'relationship can be restored');

    const refetchedShows = await person.favoriteShows;

    assert.notEqual(refetchedShows, shows, 'ManyArray not reused');
    assert.deepEqual(
      refetchedShows.map((r) => r.id),
      ['2', '3'],
      'unload async not treated as a delete'
    );

    assert.strictEqual(findManyCalls, 1, 'findMany calls as expected');
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
            id: '1',
          },
        },
      };

      let data = [
        {
          id: '3',
          type: 'boat',
          relationships,
        },
      ];

      if (!isUnloaded) {
        data.unshift({
          id: '2',
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
          id: '1',
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
      person.boats
        .then((asyncRecords) => {
          boats = asyncRecords;
          [boat2, boat3] = boats.slice();
        })
        .then(() => {
          assert.deepEqual(person.hasMany('boats').ids(), ['2', '3'], 'initially relationship established rhs');
          assert.strictEqual(boat2.belongsTo('person').id(), '1', 'initially relationship established rhs');
          assert.strictEqual(boat3.belongsTo('person').id(), '1', 'initially relationship established rhs');

          isUnloaded = true;
          run(() => {
            boat2.unloadRecord();
            person.boats;
          });

          assert.deepEqual(
            boats.map((r) => r.id),
            ['3'],
            'unloaded boat is removed from ManyArray'
          );
        })
        .then(() => {
          return run(() => person.boats);
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
          id: '1',
          type: 'person',
        },
      };
    };

    run(() =>
      store.push({
        data: {
          id: '1',
          type: 'person',
        },
      })
    );

    return run(() => store.findRecord('person', 1, { backgroundReload: true }).then((person) => person.unloadRecord()));
  });
});
