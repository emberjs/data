import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import EmberObject from '@ember/object';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import { resolve } from 'rsvp';

module('integration/requests - running requests with minimum serializer', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function(assert) {
    this.owner.register('service:store', Store);
    this.owner.register(
      'model:person',
      class Person extends Model {
        @attr name;
      }
    );
  });

  test('findAll calls normalizeResponse', async function(assert) {
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;
        assert.equal(requestType, 'findAll', 'expected method name is correct');
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
      defaultSerializer = 'application';

      ajax(url, type) {
        return resolve({ data: [] });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let response = await store.findAll('person');

    assert.equal(normalizeResponseCalled, 1, 'normalizeResponse is called once');
    assert.deepEqual(response.mapBy('id'), ['urn:person:1'], 'response is expected response');
  });
});
