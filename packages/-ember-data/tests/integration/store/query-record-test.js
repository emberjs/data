import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/store/query-record - Query one record with a query hash', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  testInDebug('It raises an assertion when no type is passed', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function () {
      store.queryRecord();
    }, "You need to pass a model name to the store's queryRecord method");
  });

  testInDebug('It raises an assertion when no query hash is passed', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function () {
      store.queryRecord('person');
    }, "You need to pass a query hash to the store's queryRecord method");
  });

  test("When a record is requested, the adapter's queryRecord method should be called.", function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let Person = store.modelFor('person');

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        queryRecord(store, type, query) {
          assert.strictEqual(type, Person, 'the query method is called with the correct type');
          return resolve({
            data: { id: '1', type: 'person', attributes: { name: 'Peter Wagenet' } },
          });
        },
      })
    );

    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    run(function () {
      store.queryRecord('person', { related: 'posts' });
    });
  });

  test('When a record is requested, and the promise is rejected, .queryRecord() is rejected.', function (assert) {
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        queryRecord(store, type, query) {
          return reject();
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function () {
      store.queryRecord('person', {}).catch(function (reason) {
        assert.ok(true, 'The rejection handler was called');
      });
    });
  });

  test("When a record is requested, the serializer's normalizeQueryRecordResponse method should be called.", function (assert) {
    assert.expect(1);

    this.owner.register(
      'serializer:person',
      class extends JSONAPISerializer {
        normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType) {
          assert.strictEqual(
            payload.data.id,
            '1',
            'the normalizeQueryRecordResponse method was called with the right payload'
          );
          return super.normalizeQueryRecordResponse(...arguments);
        }
      }
    );

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        queryRecord(store, type, query) {
          return resolve({
            data: {
              id: '1',
              type: 'person',
              attributes: {
                name: 'Peter Wagenet',
              },
            },
          });
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function () {
      store.queryRecord('person', { related: 'posts' });
    });
  });
});
