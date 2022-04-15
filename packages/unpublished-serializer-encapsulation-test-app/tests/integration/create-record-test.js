import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';
import Store from 'serializer-encapsulation-test-app/services/store';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';

class Person extends Model {
  @attr
  firstName;

  @attr
  lastName;

  // override to not call serialize()
  toJSON() {
    const { id, firstName, lastName } = this;
    return {
      id,
      type: this.constructor.modelName,
      attributes: {
        firstName,
        lastName,
      },
    };
  }
}

module('integration/create-record - running createRecord with minimum serializer', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    this.owner.register('service:store', Store);
    this.owner.register('model:person', Person);
  });

  test('save after createRecord calls normalizeResponse and serialize', async function (assert) {
    let serializeCalled = 0;
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'John', lastName: 'Smith' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: snapshot.attributes(),
        };

        return serializedResource;
      }

      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;

        assert.strictEqual(requestType, 'createRecord', 'expected method name is correct');
        assert.deepEqual(rawPayload, {
          id: '1m',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        });

        return {
          data: rawPayload,
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      ajax(url, type) {
        return resolve({
          id: '1m',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
    });

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    await person.save();

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse called once');
    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(person.toJSON(), {
      id: '1m',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });

  test('save after createRecord calls normalizeResponse and serializeIntoHash if implemented', async function (assert) {
    let serializeCalled = 0;
    let serializeIntoHashCalled = 0;
    let normalizeResponseCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      serializeIntoHash(hash, ModelClass, snapshot, options) {
        serializeIntoHashCalled++;

        hash[snapshot.modelName] = this.serialize(snapshot, options).data;
      }

      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'John', lastName: 'Smith' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: snapshot.attributes(),
        };

        return serializedResource;
      }

      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;

        assert.strictEqual(requestType, 'createRecord', 'expected method name is correct');
        assert.deepEqual(rawPayload, {
          person: {
            id: '1m',
            type: 'person',
            attributes: {
              firstName: 'Chris',
              lastName: 'Thoburn',
            },
          },
        });

        return {
          data: rawPayload.person,
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      ajax(url, type) {
        return resolve({
          person: {
            id: '1m',
            type: 'person',
            attributes: {
              firstName: 'Chris',
              lastName: 'Thoburn',
            },
          },
        });
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
    });

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    await person.save();

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse called once');
    assert.strictEqual(serializeIntoHashCalled, 1, 'serializeIntoHash called once');
    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(person.toJSON(), {
      id: '1m',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });
});
