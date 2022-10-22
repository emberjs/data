import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';
import Store from 'serializer-encapsulation-test-app/services/store';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';

module('integration/requests - running requests with minimum serializer', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    this.owner.register('service:store', Store);
    this.owner.register(
      'model:person',
      class Person extends Model {
        @attr name;
      }
    );
  });

  test('findAll calls normalizeResponse', async function (assert) {
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;
        assert.strictEqual(requestType, 'findAll', 'expected method name is correct');
        assert.deepEqual(rawPayload, { data: [] });
        return {
          data: [
            {
              type: 'person',
              id: 'urn:person:1',
              attributes: {
                name: 'Chris',
              },
            },
          ],
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      ajax(url, type) {
        return resolve({ data: [] });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let response = await store.findAll('person');

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
    assert.deepEqual(
      response.map((r) => r.id),
      ['urn:person:1'],
      'response is expected response'
    );
  });

  test('findRecord calls normalizeResponse', async function (assert) {
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;
        assert.strictEqual(requestType, 'findRecord', 'expected method name is correct');
        assert.deepEqual(rawPayload, {
          data: {
            type: 'person',
            id: 'urn:person:1',
            attributes: {
              name: 'Chris',
            },
          },
        });
        return {
          data: {
            type: 'person',
            id: 'urn:person:1',
            attributes: {
              name: 'John',
            },
          },
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      ajax(url, type) {
        return resolve({
          data: {
            type: 'person',
            id: 'urn:person:1',
            attributes: {
              name: 'Chris',
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let response = await store.findRecord('person', 'urn:person:1');

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
    assert.deepEqual(response.name, 'John', 'response is expected response');
  });

  test('query calls normalizeResponse', async function (assert) {
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;
        assert.strictEqual(requestType, 'query', 'expected method name is correct');
        assert.deepEqual(rawPayload, { data: [] });
        return {
          data: [
            {
              type: 'person',
              id: 'urn:person:1',
              attributes: {
                name: 'Chris',
              },
            },
          ],
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      ajax(url, type) {
        return resolve({ data: [] });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let response = await store.query('person', { name: 'Chris' });

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
    assert.deepEqual(
      response.map((r) => r.id),
      ['urn:person:1'],
      'response is expected response'
    );
  });

  test('queryRecord calls normalizeResponse', async function (assert) {
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;
        assert.strictEqual(requestType, 'queryRecord', 'expected method name is correct');
        assert.deepEqual(rawPayload, {
          data: {
            type: 'person',
            id: 'urn:person:1',
            attributes: {
              name: 'Chris',
            },
          },
        });
        return {
          data: {
            type: 'person',
            id: 'urn:person:1',
            attributes: {
              name: 'John',
            },
          },
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      ajax(url, type) {
        return resolve({
          data: {
            type: 'person',
            id: 'urn:person:1',
            attributes: {
              name: 'Chris',
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let response = await store.queryRecord('person', { name: 'Chris' });

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse is called once');
    assert.deepEqual(response.name, 'John', 'response is expected response');
  });
});
