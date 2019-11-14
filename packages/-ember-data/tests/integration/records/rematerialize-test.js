/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|bob|dudu)" }]*/

import { run } from '@ember/runloop';
import { setupTest } from 'ember-qunit';
import deepCopy from 'dummy/tests/helpers/deep-copy';
import { module, test } from 'qunit';
import { IDENTIFIERS } from '@ember-data/canary-features';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('integration/unload - Rematerializing Unloaded Records', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test('a sync belongs to relationship to an unloaded record can restore that record', function(assert) {
    const Person = Model.extend({
      name: attr('string'),
      cars: hasMany('car', { async: false }),
      toString: () => 'Person',
    });

    const Car = Model.extend({
      make: attr('string'),
      model: attr('string'),
      person: belongsTo('person', { async: false }),
      toString: () => 'Car',
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:car', Car);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    // disable background reloading so we do not re-create the relationship.
    adapter.shouldBackgroundReloadRecord = () => false;

    let adam = run(() => {
      store.push({
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

      return store.peekRecord('person', 1);
    });

    let bob = run(() => {
      store.push({
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

      return store.peekRecord('car', 1);
    });

    let person = store.peekRecord('person', 1);
    assert.equal(person.get('cars.length'), 1, 'The inital length of cars is correct');

    assert.equal(store.hasRecordForId('person', 1), true, 'The person is in the store');
    assert.equal(
      store._internalModelsFor('person').has(IDENTIFIERS ? '@ember-data:lid-person-1' : '1'),
      true,
      'The person internalModel is loaded'
    );

    run(() => person.unloadRecord());

    assert.equal(store.hasRecordForId('person', 1), false, 'The person is unloaded');
    assert.equal(
      store._internalModelsFor('person').has(IDENTIFIERS ? '@ember-data:lid-person-1' : '1'),
      false,
      'The person internalModel is freed'
    );

    run(() => {
      store.push({
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
    });

    let rematerializedPerson = bob.get('person');
    assert.equal(rematerializedPerson.get('id'), '1');
    assert.equal(rematerializedPerson.get('name'), 'Adam Sunderland');
    // the person is rematerialized; the previous person is *not* re-used
    assert.notEqual(rematerializedPerson, adam, 'the person is rematerialized, not recycled');
  });

  test('an async has many relationship to an unloaded record can restore that record', function(assert) {
    assert.expect(16);

    const Person = Model.extend({
      name: attr('string'),
      boats: hasMany('boat', { async: true }),
      toString: () => 'Person',
    });

    const Boat = Model.extend({
      name: attr('string'),
      person: belongsTo('person', { async: false }),
      toString: () => 'Boat',
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:boat', Boat);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

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
    adapter.findRecord = function(store, model, param) {
      assert.ok(true, `adapter called ${++adapterCalls}x`);

      let data;
      if (param === '1') {
        data = deepCopy(BOAT_ONE);
      } else if (param === '2') {
        data = deepCopy(BOAT_TWO);
      } else {
        throw new Error(`404: no such boat with id=${param}`);
      }

      return {
        data,
      };
    };

    run(() => {
      store.push({
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
    });

    run(() => {
      store.push({
        data: [deepCopy(BOAT_ONE), deepCopy(BOAT_TWO)],
      });
    });

    let adam = store.peekRecord('person', '1');
    let boaty = store.peekRecord('boat', '1');

    // assert our initial cache state
    assert.equal(store.hasRecordForId('person', '1'), true, 'The person is in the store');
    assert.equal(
      store._internalModelsFor('person').has(IDENTIFIERS ? '@ember-data:lid-person-1' : '1'),
      true,
      'The person internalModel is loaded'
    );
    assert.equal(store.hasRecordForId('boat', '1'), true, 'The boat is in the store');
    assert.equal(
      store._internalModelsFor('boat').has(IDENTIFIERS ? '@ember-data:lid-boat-1' : '1'),
      true,
      'The boat internalModel is loaded'
    );

    let boats = run(() => adam.get('boats'));
    assert.equal(boats.get('length'), 2, 'Before unloading boats.length is correct');

    run(() => boaty.unloadRecord());
    assert.equal(boats.get('length'), 1, 'after unloading boats.length is correct');

    // assert our new cache state
    assert.equal(store.hasRecordForId('boat', '1'), false, 'The boat is unloaded');
    assert.equal(
      store._internalModelsFor('boat').has(IDENTIFIERS ? '@ember-data:lid-boat-1' : '1'),
      true,
      'The boat internalModel is retained'
    );

    // cause a rematerialization, this should also cause us to fetch boat '1' again
    boats = run(() => adam.get('boats'));
    let rematerializedBoaty = boats.objectAt(1);

    assert.ok(!!rematerializedBoaty, 'We have a boat!');
    assert.equal(adam.get('boats.length'), 2, 'boats.length correct after rematerialization');
    assert.equal(rematerializedBoaty.get('id'), '1', 'Rematerialized boat has the right id');
    assert.equal(rematerializedBoaty.get('name'), 'Boaty McBoatface', 'Rematerialized boat has the right name');
    assert.ok(rematerializedBoaty !== boaty, 'the boat is rematerialized, not recycled');

    assert.equal(store.hasRecordForId('boat', '1'), true, 'The boat is loaded');
    assert.equal(
      store._internalModelsFor('boat').has(IDENTIFIERS ? '@ember-data:lid-boat-1' : '1'),
      true,
      'The boat internalModel is retained'
    );
  });
});
