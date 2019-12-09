import { resolve, reject } from 'rsvp';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import AdapterError from '@ember-data/adapter/error';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import Model, { attr } from '@ember-data/model';

class Person extends Model {
  @attr name;
}
module('integration/adapter/handle-response', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', JSONAPISerializer);

    this.store = this.owner.lookup('service:store');
  });
  test('handleResponse is called with normal response', async function(assert) {
    let handleResponseCalled = 0;

    let samplePayload = {
      data: [
        {
          id: 1,
          type: 'person',
          attributes: {
            name: 'John Smith',
          },
        },
        {
          id: 2,
          type: 'person',
          attributes: {
            name: 'Zhang San',
          },
        },
      ],
    };

    let ajaxResponse = {
      status: '200',
      headers: {},
      text() {
        return resolve(JSON.stringify(samplePayload));
      },
    };

    let fetchResponse = {
      ok: true,
      status: '200',
      headers: [],
      text() {
        return resolve(JSON.stringify(samplePayload));
      },
    };

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        if (this.isSuccess(status, headers, payload)) {
          return payload;
        }

        let errors = this.normalizeErrorResponse(status, headers, payload);
        let detailedMessage = this.generatedDetailedMessage(status, headers, payload, requestData);

        return new AdapterError(errors, detailedMessage);
      }

      _ajaxRequest() {
        return resolve(ajaxResponse);
      }

      _fetchRequest() {
        return resolve(fetchResponse);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    await this.store.findAll('person');

    assert.equal(handleResponseCalled, 1, 'handle response is called');
  });
  test('handleResponse is called with empty response', async function(assert) {
    let handleResponseCalled = 0;

    let samplePayload = {
      data: [],
    };

    let ajaxResponse = {
      status: '200',
      headers: {},
      text() {
        return resolve(JSON.stringify(samplePayload));
      },
    };

    let fetchResponse = {
      ok: true,
      status: '200',
      headers: [],
      text() {
        return resolve(JSON.stringify(samplePayload));
      },
    };

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        if (this.isSuccess(status, headers, payload)) {
          return payload;
        }

        let errors = this.normalizeErrorResponse(status, headers, payload);
        let detailedMessage = this.generatedDetailedMessage(status, headers, payload, requestData);

        return new AdapterError(errors, detailedMessage);
      }

      _ajaxRequest() {
        return resolve(ajaxResponse);
      }

      _fetchRequest() {
        return resolve(fetchResponse);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    await this.store.findAll('person');

    assert.equal(handleResponseCalled, 1, 'handle response is called');
  });

  test('handleResponse is called on empty repsonse', async function(assert) {
    let handleResponseCalled = 0;

    let ajaxResponse = {
      status: '200',
      headers: {},
      text() {
        return reject('');
      },
    };

    let fetchResponse = {
      ok: true,
      status: '200',
      headers: {
        forEach(callback) {
          callback('json', 'content-type');
        },
      },
      text() {
        return reject('');
      },
    };

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        if (this.isSuccess(status, headers, payload)) {
          return payload;
        }

        let errors = this.normalizeErrorResponse(status, headers, payload);
        let detailedMessage = this.generatedDetailedMessage(status, headers, payload, requestData);

        return new AdapterError(errors, detailedMessage);
      }

      _ajaxRequest() {
        return reject(ajaxResponse);
      }

      _fetchRequest() {
        return reject(fetchResponse);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    try {
      await this.store.findAll('person');
      assert.ok(false, 'promise should reject');
    } catch {
      assert.ok(true, 'promise rejected');
    }

    assert.equal(handleResponseCalled, 1, 'handle response is called');
  });
  test('handleResponse is called on invalid repsonse', async function(assert) {
    let handleResponseCalled = 0;

    let ajaxResponse = {
      status: '200',
      headers: {},
      text() {
        return reject('bogus response');
      },
    };

    let fetchResponse = {
      ok: true,
      status: '200',
      headers: {
        forEach(callback) {
          callback('json', 'content-type');
        },
      },
      text() {
        return reject('bogus reponse');
      },
    };

    class TestAdapter extends JSONAPIAdapter {
      handleResponse(status, headers, payload, requestData) {
        handleResponseCalled++;

        if (this.isSuccess(status, headers, payload)) {
          return payload;
        }

        let errors = this.normalizeErrorResponse(status, headers, payload);
        let detailedMessage = this.generatedDetailedMessage(status, headers, payload, requestData);

        return new AdapterError(errors, detailedMessage);
      }

      _ajaxRequest() {
        return reject(ajaxResponse);
      }

      _fetchRequest() {
        return reject(fetchResponse);
      }
    }

    this.owner.register('adapter:application', TestAdapter);

    try {
      await this.store.findAll('person');
      assert.ok(false, 'promise should reject');
    } catch {
      assert.ok(true, 'promise rejected');
    }

    assert.equal(handleResponseCalled, 1, 'handle response is called');
  });
});
