import Pretender from 'pretender';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

class Person extends Model {
  @attr name;
}
module('integration/adapter/handle-response', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    this.store = this.owner.lookup('service:store');
    this.server = new Pretender();
  });

  hooks.afterEach(function () {
    if (this.server) {
      this.server.shutdown();
      this.server = null;
    }
  });

  test('handleResponse is called with normal response', async function (assert) {
    let handleResponseCalled = 0;

    let samplePayload = {
      data: [
        {
          id: '1',
          type: 'person',
          attributes: {
            name: 'John Smith',
          },
        },
        {
          id: '2',
          type: 'person',
          attributes: {
            name: 'Zhang San',
          },
        },
      ],
    };

    this.server.get('/people', function () {
      return ['200', { 'Content-Type': 'application/json' }, JSON.stringify(samplePayload)];
    });

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        return super.handleResponse(status, headers, payload, requestData);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    await this.store.findAll('person');

    assert.strictEqual(handleResponseCalled, 1, 'handle response is called');
  });

  test('handleResponse is called with empty array response', async function (assert) {
    let handleResponseCalled = 0;

    let samplePayload = {
      data: [],
    };

    this.server.get('/people', function () {
      return ['200', { 'Content-Type': 'application/json' }, JSON.stringify(samplePayload)];
    });

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        return super.handleResponse(status, headers, payload, requestData);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    await this.store.findAll('person');

    assert.strictEqual(handleResponseCalled, 1, 'handle response is called');
  });

  test('handleResponse is called on empty string response', async function (assert) {
    let handleResponseCalled = 0;

    this.server.get('/people', function () {
      return ['200', { 'Content-Type': 'application/json' }, ''];
    });

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        return super.handleResponse(status, headers, payload, requestData);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    try {
      await this.store.findAll('person');
      assert.ok(false, 'promise should reject');
    } catch {
      assert.ok(true, 'promise rejected');
    }

    assert.strictEqual(handleResponseCalled, 1, 'handle response is called');
  });

  test('handleResponse is not called on invalid response', async function (assert) {
    let handleResponseCalled = 0;

    this.server.get('/people', function () {
      return ['200', { 'Content-Type': 'application/json' }, 'bogus response'];
    });

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        return super.handleResponse(status, headers, payload, requestData);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    try {
      await this.store.findAll('person');
      assert.ok(false, 'promise should reject');
    } catch {
      assert.ok(true, 'promise rejected');
    }

    assert.strictEqual(handleResponseCalled, 0, 'handle response is not called');
  });

  test('handleResponse is called on empty string response with 400 status', async function (assert) {
    let handleResponseCalled = 0;

    this.server.get('/people', function () {
      return ['400', { 'Content-Type': 'application/json' }, ''];
    });

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        return super.handleResponse(status, headers, payload, requestData);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    try {
      await this.store.findAll('person');
      assert.ok(false, 'promise should reject');
    } catch {
      assert.ok(true, 'promise rejected');
    }

    assert.strictEqual(handleResponseCalled, 1, 'handle response is called');
  });

  test('handleResponse is called with correct parameters on string response with 422 status', async function (assert) {
    let handleResponseCalled = 0;

    let errorObject = { errors: {} };

    this.server.get('/people', function () {
      return ['422', { 'Content-Type': 'application/json' }, JSON.stringify(errorObject)];
    });

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;
        assert.deepEqual(payload, errorObject, 'payload from handleResponse matches expected error');

        return super.handleResponse(status, headers, payload, requestData);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    try {
      await this.store.findAll('person');
      assert.ok(false, 'promise should reject');
    } catch {
      assert.ok(true, 'promise rejected');
    }

    assert.strictEqual(handleResponseCalled, 1, 'handle response is called');
  });
});
