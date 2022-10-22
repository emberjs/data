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

module('integration/delete-record - running deleteRecord with minimum serializer', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    this.owner.register('service:store', Store);
    this.owner.register('model:person', Person);
  });

  test('save after deleting record does not call normalizeResponse and serialize', async function (assert) {
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
      '',
    ];

    class TestMinimumSerializer extends EmberObject {
      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;

        assert.strictEqual(requestType, 'findRecord', 'expected method name is correct');
        assert.deepEqual(
          rawPayload,
          {
            id: '1',
            type: 'person',
            attributes: {
              firstName: 'John',
              lastName: 'Smith',
            },
          },
          'payload is correct'
        );

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

    person.deleteRecord();
    await person.save();

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse called once');
  });

  test('save after deleting record does not call normalizeResponse and serializeIntoHash if implemented', async function (assert) {
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
      '',
    ];

    class TestMinimumSerializer extends EmberObject {
      serializeIntoHash() {
        serializeIntoHashCalled++;
      }

      serialize() {
        serializeCalled++;
      }

      normalizeResponse(store, schema, rawPayload, id, requestType) {
        normalizeResponseCalled++;

        assert.strictEqual(requestType, 'findRecord', 'expected method name is correct');
        assert.deepEqual(
          rawPayload,
          {
            id: '1',
            type: 'person',
            attributes: {
              firstName: 'John',
              lastName: 'Smith',
            },
          },
          'payload is correct'
        );

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

    person.deleteRecord();
    await person.save();

    assert.strictEqual(normalizeResponseCalled, 1, 'normalizeResponse called once');
    assert.strictEqual(serializeIntoHashCalled, 0, 'serializeIntoHash not called');
    assert.strictEqual(serializeCalled, 0, 'serialize not called');
  });

  test('save after deleting record does call normalizeResponse if response provided', async function (assert) {
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
        success: true,
        errors: {},
      },
    ];

    class TestMinimumSerializer extends EmberObject {
      _payloads = [..._payloads];
      _methods = ['findRecord', 'deleteRecord'];

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

    person.deleteRecord();
    await person.save();

    assert.strictEqual(normalizeResponseCalled, 2, 'normalizeResponse called twice');
  });
});
