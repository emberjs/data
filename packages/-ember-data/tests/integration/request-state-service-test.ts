import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import EmberObject from '@ember/object';
import { attr, hasMany, belongsTo } from '@ember-data/model';

interface RecordIdentifier {
  id?: string;
  type: string;
  lid: string;
}

interface JsonApiValidationError {
  title: string;
  detail: string;
  source: {
    pointer: string;
  }
}

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}
module('integration/request-state-service - Request State Service', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test("Request state service igor5", async function (assert) {
    assert.expect(10);

    const personHash = {
      type: 'person',
      id: '1',
      name: 'Scumbag Dale'
    };

    let normalizedHash = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Scumbag Dale',
        },
        relationships: {}
      },
      included: []
    };

    let { owner } = this;

    let TestAdapter = EmberObject.extend({
      findRecord() {
        return Promise.resolve(personHash);
      },
      deleteRecord() {
        return Promise.resolve();
      },

      updateRecord() {
        return Promise.resolve();
      },

      createRecord() {
        return Promise.resolve();
      }
    });

    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store');

    let promise = store.findRecord('person', '1');
    let requestService = store.getRequestStateService();

    // Relying on sequential lids until identifiers land
    let identifier = { type: 'person', id: '1', lid: '1'};
    let request = requestService.getPendingRequestsForRecord(identifier)[0];

    assert.equal(request.state, 'pending', 'request is pending');
    assert.equal(request.type, 'query', 'request is a query');
    let requestOp = {
      op: 'findRecord',
      recordIdentifier: { id: '1', type: 'person', lid: '1'},
      options: {}
    };
    assert.deepEqual(request.request.data[0], requestOp, 'request op is correct');

    let person = await promise;
    let lastRequest = requestService.getLastRequestForRecord(identifier);
    let requestStateResult = {
      type: 'query',
      state: 'fulfilled',
      request: { data: [requestOp] },
      response: { data: normalizedHash }
    };
    assert.deepEqual(lastRequest, requestStateResult, 'request is correct after fulfilling');
    assert.deepEqual(requestService.getPendingRequestsForRecord(identifier).length, 0, 'no pending requests remaining');

    let savingPromise = person.save();
    let savingRequest = requestService.getPendingRequestsForRecord(identifier)[0];

    assert.equal(savingRequest.state, 'pending', 'request is pending');
    assert.equal(savingRequest.type, 'mutation', 'request is a mutation');
    let savingRequestOp = {
      op: 'saveRecord',
      recordIdentifier: { id: '1', type: 'person', lid: '1'},
      options: {}
    };
    assert.deepEqual(savingRequest.request.data[0], savingRequestOp, 'request op is correct');

    await savingPromise;
    let lastSavingRequest = requestService.getLastRequestForRecord(identifier);
    let savingRequestStateResult = {
      type: 'mutation',
      state: 'fulfilled',
      request: { data: [savingRequestOp] },
      response: { data: undefined }
    };
    assert.deepEqual(lastSavingRequest, savingRequestStateResult, 'request is correct after fulfilling');
    assert.deepEqual(requestService.getPendingRequestsForRecord(identifier).length, 0, 'no pending requests remaining');
  });
});
