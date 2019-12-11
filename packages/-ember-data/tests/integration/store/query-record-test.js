import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/store/query-record - Query one record with a query hash', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const Person = DS.Model.extend({
      name: DS.attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  testInDebug('It raises an assertion when no type is passed', function(assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function() {
      store.queryRecord();
    }, "You need to pass a model name to the store's queryRecord method");
  });

  testInDebug('It raises an assertion when no query hash is passed', function(assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function() {
      store.queryRecord('person');
    }, "You need to pass a query hash to the store's queryRecord method");
  });

  test("When a record is requested, the adapter's queryRecord method should be called.", function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let Person = store.modelFor('person');

    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        queryRecord(store, type, query) {
          assert.equal(type, Person, 'the query method is called with the correct type');
          return resolve({
            data: { id: 1, type: 'person', attributes: { name: 'Peter Wagenet' } },
          });
        },
      })
    );

    this.owner.register('serializer:application', DS.JSONAPISerializer.extend());

    run(function() {
      store.queryRecord('person', { related: 'posts' });
    });
  });

  test('When a record is requested, and the promise is rejected, .queryRecord() is rejected.', function(assert) {
    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        queryRecord(store, type, query) {
          return reject();
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function() {
      store.queryRecord('person', {}).catch(function(reason) {
        assert.ok(true, 'The rejection handler was called');
      });
    });
  });

  test("When a record is requested, the serializer's normalizeQueryRecordResponse method should be called.", function(assert) {
    assert.expect(1);

    this.owner.register(
      'serializer:person',
      DS.JSONAPISerializer.extend({
        normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType) {
          assert.equal(
            payload.data.id,
            '1',
            'the normalizeQueryRecordResponse method was called with the right payload'
          );
          return this._super(...arguments);
        },
      })
    );

    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
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

    run(function() {
      store.queryRecord('person', { related: 'posts' });
    });
  });
});
