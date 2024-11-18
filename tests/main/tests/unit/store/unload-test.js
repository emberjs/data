import { get } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

let store, tryToFind;

module('unit/store/unload - Store unloading records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Record = Model.extend({
      title: attr('string'),
      wasFetched: attr('boolean'),
    });

    this.owner.register('model:record', Record);
    this.owner.register('serializer:application', JSONAPISerializer);

    this.owner.register(
      'adapter:application',
      Adapter.extend({
        findRecord(store, type, id, snapshot) {
          tryToFind = true;
          return Promise.resolve({
            data: { id, type: snapshot.modelName, attributes: { 'was-fetched': true } },
          });
        },
      })
    );

    store = this.owner.lookup('service:store');
  });

  testInDebug('unload an in-flight record asserts', async function (assert) {
    assert.expect(2);

    const record = store.push({
      data: {
        type: 'record',
        id: '1',
        attributes: {
          title: 'toto',
        },
      },
    });
    const adapter = store.adapterFor('application');

    let resolveLater;
    const retPromise = new Promise((resolve) => {
      resolveLater = resolve;
    });
    adapter.updateRecord = () => {
      return retPromise;
    };

    record.set('title', 'toto2');
    assert.strictEqual(get(record, 'hasDirtyAttributes'), true, 'record is dirty');
    const promise = record.save();

    assert.expectAssertion(
      function () {
        record.unloadRecord();
      },
      `You can only unload a record which is not inFlight. '` + recordIdentifierFor(record).toString() + `'`,
      'can not unload dirty record'
    );

    // force back into safe to unload mode.
    resolveLater({ data: { type: 'record', id: '1' } });
    await promise;
  });

  test('unload a record', async function (assert) {
    assert.expect(2);

    store.push({
      data: {
        type: 'record',
        id: '1',
        attributes: {
          title: 'toto',
        },
      },
    });

    const record = await store.findRecord('record', '1');
    assert.strictEqual(get(record, 'id'), '1', 'found record with id 1');

    store.unloadRecord(record);

    tryToFind = false;

    await store.findRecord('record', '1');
    assert.true(tryToFind, 'not found record with id 1');
  });

  test('unload followed by create of the same type + id', async function (assert) {
    const record = store.createRecord('record', { id: '1' });

    assert.strictEqual(store.peekRecord('record', 1), record, 'record should exactly equal');

    record.unloadRecord();
    const createdRecord = store.createRecord('record', { id: '1' });
    assert.notStrictEqual(record, createdRecord, 'newly created record is fresh (and was created)');
  });
});

module('Store - unload record with relationships', function (hooks) {
  setupTest(hooks);

  test('can commit store after unload record with relationships', async function (assert) {
    assert.expect(1);

    const Brand = Model.extend({
      name: attr('string'),
    });

    const Product = Model.extend({
      description: attr('string'),
      brand: belongsTo('brand', {
        async: false,
        inverse: null,
      }),
    });

    const Like = Model.extend({
      product: belongsTo('product', {
        async: false,
        inverse: null,
      }),
    });

    this.owner.register('model:brand', Brand);
    this.owner.register('model:product', Product);
    this.owner.register('model:like', Like);

    this.owner.register('serializer:application', JSONAPISerializer);

    this.owner.register(
      'adapter:application',
      Adapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },
        findRecord(store, type, id, snapshot) {
          return Promise.resolve({
            data: {
              id: '1',
              type: snapshot.modelName,
              attributes: {
                description: 'cuisinart',
                brand: 1,
              },
            },
          });
        },

        createRecord(store, type, snapshot) {
          return Promise.resolve();
        },
      })
    );

    const store = this.owner.lookup('service:store');

    store.push({
      data: [
        {
          type: 'brand',
          id: '1',
          attributes: {
            name: 'EmberJS',
          },
        },
        {
          type: 'product',
          id: '1',
          attributes: {
            description: 'toto',
          },
          relationships: {
            brand: {
              data: { type: 'brand', id: '1' },
            },
          },
        },
      ],
    });

    let product = store.peekRecord('product', 1);
    const like = store.createRecord('like', { id: '1', product: product });

    await like.save();

    // TODO: this is strange, future travelers please address
    store.unloadRecord(product);

    product = await store.findRecord('product', '1');

    assert.strictEqual(
      product.description,
      'cuisinart',
      "The record was unloaded and the adapter's `findRecord` was called"
    );
  });
});
