import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/unload - Rematerializing Unloaded Records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('a sync belongs to relationship to an unloaded record can restore that record', function (assert) {
    class Person extends Model {
      @attr('string') name;
      @hasMany('car', { async: false, inverse: 'person' }) cars;
    }

    class Car extends Model {
      @attr('string') make;
      @attr('string') model;
      @belongsTo('person', { async: false, inverse: 'cars' }) person;
    }

    this.owner.register('model:person', Person);
    this.owner.register('model:car', Car);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    // disable background reloading so we do not re-create the relationship.
    adapter.shouldBackgroundReloadRecord = () => false;

    const adam = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
        relationships: {
          cars: {
            data: [{ type: 'car', id: '1' }],
          },
        },
      },
    });

    const lotus = store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'Lotus',
          model: 'Exige',
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' },
          },
        },
      },
    });

    assert.strictEqual(adam.cars.length, 1, 'The inital length of cars is correct');

    assert.notStrictEqual(store.peekRecord('person', '1'), null, 'The person is in the store');
    assert.true(
      !!store.identifierCache.peekRecordIdentifier({ lid: '@lid:person-1' }),
      'The person identifier is loaded'
    );

    adam.unloadRecord();

    assert.strictEqual(store.peekRecord('person', '1'), null, 'The person is unloaded');
    assert.false(
      !!store.identifierCache.peekRecordIdentifier({ lid: '@lid:person-1' }),
      'The person identifier is freed'
    );

    const newAdam = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
        relationships: {
          cars: {
            data: [{ type: 'car', id: '1' }],
          },
        },
      },
    });

    const rematerializedPerson = lotus.person;
    assert.strictEqual(rematerializedPerson.id, '1');
    assert.strictEqual(rematerializedPerson.name, 'Adam Sunderland');
    assert.strictEqual(rematerializedPerson, newAdam);
    // the person is rematerialized; the previous person is *not* re-used
    assert.notEqual(rematerializedPerson, adam, 'the person is rematerialized, not recycled');
  });

  test('an async has many relationship to an unloaded record can restore that record', async function (assert) {
    assert.expect(16);

    const Person = Model.extend({
      name: attr('string'),
      boats: hasMany('boat', { async: true, inverse: 'person' }),
      toString: () => 'Person',
    });

    const Boat = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false, inverse: 'boats' }),
      toString: () => 'Boat',
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:boat', Boat);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    // disable background reloading so we do not re-create the relationship.
    adapter.shouldBackgroundReloadRecord = () => false;

    const BOAT_ONE = {
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

    const BOAT_TWO = {
      type: 'boat',
      id: '2',
      attributes: {
        name: 'Some other boat',
      },
      relationships: {
        person: {
          data: { type: 'person', id: '1' },
        },
      },
    };

    let adapterCalls = 0;
    adapter.findRecord = function (store, model, param) {
      assert.ok(true, `adapter called ${++adapterCalls}x`);

      let data;
      if (param === '1') {
        data = structuredClone(BOAT_ONE);
      } else if (param === '2') {
        data = structuredClone(BOAT_TWO);
      } else {
        throw new Error(`404: no such boat with id=${param}`);
      }

      return {
        data,
      };
    };

    const adam = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
        relationships: {
          boats: {
            data: [
              { type: 'boat', id: '2' },
              { type: 'boat', id: '1' },
            ],
          },
        },
      },
    });

    const [boaty] = store.push({
      data: [structuredClone(BOAT_ONE), structuredClone(BOAT_TWO)],
    });

    // assert our initial cache state
    assert.notStrictEqual(store.peekRecord('person', '1'), null, 'The person is in the store');
    assert.true(
      !!store.identifierCache.peekRecordIdentifier({ lid: '@lid:person-1' }),
      'The person identifier is loaded'
    );
    assert.notStrictEqual(store.peekRecord('boat', '1'), null, 'The boat is in the store');
    assert.true(!!store.identifierCache.peekRecordIdentifier({ lid: '@lid:boat-1' }), 'The boat identifier is loaded');

    let boats = await adam.boats;
    assert.strictEqual(boats.length, 2, 'Before unloading boats.length is correct');

    boaty.unloadRecord();
    assert.strictEqual(boats.length, 1, 'after unloading boats.length is correct');

    // assert our new cache state
    assert.strictEqual(store.peekRecord('boat', '1'), null, 'The boat is unloaded');
    assert.true(
      !!store.identifierCache.peekRecordIdentifier({ lid: '@lid:boat-1' }),
      'The boat identifier is retained'
    );

    // cause a rematerialization, this should also cause us to fetch boat '1' again
    boats = await adam.boats;
    const rematerializedBoaty = boats.at(1);

    assert.ok(!!rematerializedBoaty, 'We have a boat!');
    assert.strictEqual(adam.boats.length, 2, 'boats.length correct after rematerialization');
    assert.strictEqual(rematerializedBoaty.id, '1', 'Rematerialized boat has the right id');
    assert.strictEqual(rematerializedBoaty.name, 'Boaty McBoatface', 'Rematerialized boat has the right name');
    assert.notStrictEqual(rematerializedBoaty, boaty, 'the boat is rematerialized, not recycled');

    assert.notStrictEqual(store.peekRecord('boat', '1'), null, 'The boat is loaded');
    assert.true(
      !!store.identifierCache.peekRecordIdentifier({ lid: '@lid:boat-1' }),
      'The boat identifier is retained'
    );
  });
});
