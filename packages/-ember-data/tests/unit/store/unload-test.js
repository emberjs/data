import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

let store, tryToFind;

module('unit/store/unload - Store unloading records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let Record = Model.extend({
      title: attr('string'),
      wasFetched: attr('boolean'),
    });

    Record.reopenClass({
      toString() {
        return 'Record';
      },
    });

    this.owner.register('model:record', Record);
    this.owner.register('serializer:application', JSONAPISerializer);

    this.owner.register(
      'adapter:application',
      Adapter.extend({
        findRecord(store, type, id, snapshot) {
          tryToFind = true;
          return resolve({
            data: { id, type: snapshot.modelName, attributes: { 'was-fetched': true } },
          });
        },
      })
    );

    store = this.owner.lookup('service:store');
  });

  testInDebug('unload a dirty record asserts', function (assert) {
    assert.expect(2);

    run(() => {
      store.push({
        data: {
          type: 'record',
          id: '1',
          attributes: {
            title: 'toto',
          },
        },
      });

      let record = store.peekRecord('record', 1);

      record.set('title', 'toto2');
      record._internalModel.send('willCommit');

      assert.strictEqual(get(record, 'hasDirtyAttributes'), true, 'record is dirty');

      assert.expectAssertion(
        function () {
          record.unloadRecord();
        },
        'You can only unload a record which is not inFlight. `' + record._internalModel.toString() + '`',
        'can not unload dirty record'
      );

      // force back into safe to unload mode.
      run(() => {
        record._internalModel.transitionTo('deleted.saved');
      });
    });
  });

  test('unload a record', function (assert) {
    assert.expect(2);

    return run(() => {
      store.push({
        data: {
          type: 'record',
          id: '1',
          attributes: {
            title: 'toto',
          },
        },
      });

      return store.findRecord('record', 1).then((record) => {
        assert.strictEqual(get(record, 'id'), '1', 'found record with id 1');

        run(() => store.unloadRecord(record));

        tryToFind = false;

        return store.findRecord('record', 1).then(() => {
          assert.true(tryToFind, 'not found record with id 1');
        });
      });
    });
  });

  test('unload followed by create of the same type + id', function (assert) {
    let record = store.createRecord('record', { id: 1 });

    assert.strictEqual(store.recordForId('record', 1), record, 'record should exactly equal');

    return run(() => {
      record.unloadRecord();
      let createdRecord = store.createRecord('record', { id: 1 });
      assert.notStrictEqual(record, createdRecord, 'newly created record is fresh (and was created)');
    });
  });
});

module('Store - unload record with relationships', function (hooks) {
  setupTest(hooks);

  test('can commit store after unload record with relationships', function (assert) {
    assert.expect(1);

    const Brand = Model.extend({
      name: attr('string'),
    });

    Brand.reopenClass({
      toString() {
        return 'Brand';
      },
    });

    const Product = Model.extend({
      description: attr('string'),
      brand: belongsTo('brand', {
        async: false,
      }),
    });

    Product.reopenClass({
      toString() {
        return 'Product';
      },
    });

    const Like = Model.extend({
      product: belongsTo('product', {
        async: false,
      }),
    });

    Like.reopenClass({
      toString() {
        return 'Like';
      },
    });

    this.owner.register('model:brand', Brand);
    this.owner.register('model:product', Product);
    this.owner.register('model:like', Like);

    this.owner.register('serializer:application', JSONAPISerializer);

    this.owner.register(
      'adapter:application',
      Adapter.extend({
        findRecord(store, type, id, snapshot) {
          return resolve({
            data: {
              id: 1,
              type: snapshot.modelName,
              attributes: {
                description: 'cuisinart',
                brand: 1,
              },
            },
          });
        },

        createRecord(store, type, snapshot) {
          return resolve();
        },
      })
    );

    let store = this.owner.lookup('service:store');

    return run(() => {
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
      let like = store.createRecord('like', { id: 1, product: product });

      return like.save();
    })
      .then(() => {
        // TODO: this is strange, future travelers please address
        run(() => store.unloadRecord(store.peekRecord('product', 1)));
      })
      .then(() => {
        return store.findRecord('product', 1);
      })
      .then((product) => {
        assert.strictEqual(
          product.get('description'),
          'cuisinart',
          "The record was unloaded and the adapter's `findRecord` was called"
        );
      });
  });
});
