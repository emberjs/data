import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { SOURCE } from '@ember-data/store/-private';

let store, manager;

class Person extends Model {
  @attr()
  name;

  @hasMany('car', { async: false, inverse: 'person' })
  cars;
}

class Car extends Model {
  @attr()
  make;

  @attr()
  model;

  @belongsTo('person', { async: false, inverse: 'cars' })
  person;
}

module('integration/record_array_manager', function (hooks) {
  setupTest(hooks);
  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('adapter:application', RESTAdapter);
    owner.register('model:car', Car);
    owner.register('model:person', Person);

    store = owner.lookup('service:store');
    manager = store.recordArrayManager;
  });

  test('destroying the store correctly cleans everything up', async function (assert) {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper',
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' },
          },
        },
      },
    });

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          cars: {
            data: [{ type: 'car', id: '1' }],
          },
        },
      },
    });

    let all = store.peekAll('person');
    let query = {};
    let adapterPopulated = manager.createArray({ type: 'person', query });
    let identifier = recordIdentifierFor(person);

    assert.false(all.isDestroyed, 'initial: no calls to all.willDestroy');
    assert.false(adapterPopulated.isDestroyed, 'initial: no calls to adapterPopulated.willDestroy');
    assert.strictEqual(
      manager._identifiers.get(identifier)?.size,
      undefined,
      'initial: expected the person to be a member of 0 AdapterPopulatedRecordArrays'
    );
    assert.true(manager._live.has('person'), 'initial: we have a live array for person');

    manager.destroy();
    await settled();

    assert.true(all.isDestroyed, 'all.willDestroy called once');
    assert.false(manager._live.has('person'), 'no longer have a live array for person');
    assert.strictEqual(
      manager._identifiers.get(identifier)?.size,
      undefined,
      'expected the person to be a member of no recordArrays'
    );
    assert.true(adapterPopulated.isDestroyed, 'adapterPopulated.willDestroy called once');
  });

  test('#GH-4041 store#query AdapterPopulatedRecordArrays are removed from their managers instead of retained when #destroy is called', async function (assert) {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'Honda',
          model: 'fit',
        },
      },
    });

    const query = {};

    let adapterPopulated = manager.createArray({ type: 'car', query });

    adapterPopulated.destroy();
    await settled();

    assert.strictEqual(manager._managed.size, 0);
  });

  test('liveArrayFor (base)', function (assert) {
    let recordArray = manager.liveArrayFor('foo');

    assert.strictEqual(recordArray.modelName, 'foo');
    assert.true(recordArray.isLoaded);
    assert.strictEqual(recordArray._manager, manager, 'the manager is set correctly');
    assert.deepEqual(recordArray[SOURCE], []);
    assert.deepEqual(recordArray.slice(), []);
  });

  test('liveArrayFor always return the same array for a given type', function (assert) {
    assert.strictEqual(manager.liveArrayFor('foo'), manager.liveArrayFor('foo'));
  });

  test('liveArrayFor create with content', function (assert) {
    assert.expect(3);

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini Cooper',
        },
      },
    });

    assert.strictEqual(manager._live.size, 0, 'no record array has been created yet');
    manager.liveArrayFor('car');
    assert.strictEqual(manager._live.size, 1, 'one record array is created');
    manager.liveArrayFor('car');
    assert.strictEqual(manager._live.size, 1, 'no new record array is created');
  });
});
