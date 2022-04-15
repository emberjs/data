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

  test('save after mutating record calls normalizeResponse and serialize', async function (assert) {
    let serializeCalled = 0;
    let normalizeResponseCalled = 0;
    let _payloads = [
      {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'John',
          lastName: 'Smith',
        },
      },
      {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Chris',
          lastName: 'Thoburn',
        },
      },
    ];

    class TestMinimumSerializer extends EmberObject {
      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'Chris', lastName: 'Thoburn' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: snapshot.attributes(),
        };

        return serializedResource;
      }

      _payloads = [..._payloads];

      _methods = ['findRecord', 'updateRecord'];

      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;

        assert.strictEqual(requestType, this._methods.shift(), 'expected method name is correct');
        assert.deepEqual(rawPayload, this._payloads.shift(), 'payload is correct');

        return {
          data: rawPayload,
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      _payloads = [..._payloads];

      ajax(url, type) {
        return resolve(this._payloads.shift());
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let person = await store.findRecord('person', 1);

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    person.set('firstName', 'Chris');
    person.set('lastName', 'Thoburn');

    await person.save();

    assert.strictEqual(normalizeResponseCalled, 2, 'normalizeResponse called twice');
    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });

  test('save after mutating record calls normalizeResponse and serializeIntoHash if implemented', async function (assert) {
    let serializeCalled = 0;
    let serializeIntoHashCalled = 0;
    let normalizeResponseCalled = 0;

    let _payloads = [
      {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'John',
          lastName: 'Smith',
        },
      },
      {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Chris',
          lastName: 'Thoburn',
        },
      },
    ];

    class TestMinimumSerializer extends EmberObject {
      serializeIntoHash(hash, ModelClass, snapshot, options) {
        serializeIntoHashCalled++;

        hash[snapshot.modelName] = this.serialize(snapshot, options).data;
      }

      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'Chris', lastName: 'Thoburn' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: snapshot.attributes(),
        };

        return serializedResource;
      }

      _payloads = [..._payloads];

      _methods = ['findRecord', 'updateRecord'];

      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;

        assert.strictEqual(requestType, this._methods.shift(), 'expected method name is correct');
        assert.deepEqual(rawPayload, this._payloads.shift(), 'payload is correct');

        return {
          data: rawPayload,
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    class TestAdapter extends JSONAPIAdapter {
      _payloads = [..._payloads];

      ajax(url, type) {
        return resolve(this._payloads.shift());
      }
    }
    this.owner.register('adapter:application', TestAdapter);

    const store = this.owner.lookup('service:store');

    let person = await store.findRecord('person', 1);

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    person.set('firstName', 'Chris');
    person.set('lastName', 'Thoburn');

    await person.save();

    assert.strictEqual(normalizeResponseCalled, 2, 'normalizeResponse called twice');
    assert.strictEqual(serializeIntoHashCalled, 1, 'serializeIntoHash called once');
    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });
});
