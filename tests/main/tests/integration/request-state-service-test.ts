import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import type Store from '@ember-data/store';

class Person extends Model {
  // TODO fix the typing for naked attrs

  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}

module('integration/request-state-service - Request State Service', function (hooks) {
  setupTest(hooks);

  let store: Store;

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:person', Person);
    owner.register('serializer:application', JSONSerializer);
    store = owner.lookup('service:store') as unknown as Store;
  });

  test('getPendingRequest and getLastRequest return correct inflight and fulfilled requests', async function (assert) {
    assert.expect(10);

    const normalizedHash = {
      data: {
        type: 'person',
        id: '1',
        lid: '@lid:person-1',
        attributes: {
          name: 'Scumbag Dale',
        },
        relationships: {},
      },
      included: [],
    };

    const { owner } = this;

    const TestAdapter = EmberObject.extend({
      findRecord() {
        const personHash = {
          type: 'person',
          id: '1',
          name: 'Scumbag Dale',
        };

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
      },
    });

    owner.register('adapter:application', TestAdapter);

    store = owner.lookup('service:store') as unknown as Store;

    const promise = store.findRecord('person', '1');
    const requestService = store.getRequestStateService();

    // Relying on sequential lids until identifiers land
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    normalizedHash.data.lid = identifier.lid;
    const request = requestService.getPendingRequestsForRecord(identifier)[0];

    assert.strictEqual(request.state, 'pending', 'request is pending');
    assert.strictEqual(request.type, 'query', 'request is a query');
    const requestOp = {
      op: 'findRecord',
      recordIdentifier: identifier,
      options: {
        reload: true,
      },
    };
    assert.deepEqual(request.request.data[0], requestOp, 'request op is correct');

    const person = (await promise) as Model;
    const lastRequest = requestService.getLastRequestForRecord(identifier);
    const requestStateResult = {
      type: 'query' as const,
      state: 'fulfilled' as const,
      request: { data: [requestOp] },
      response: { data: normalizedHash },
    };
    assert.deepEqual(lastRequest, requestStateResult, 'request is correct after fulfilling');
    assert.deepEqual(requestService.getPendingRequestsForRecord(identifier).length, 0, 'no pending requests remaining');

    const savingPromise = person.save();
    const savingRequest = requestService.getPendingRequestsForRecord(identifier)[0];

    assert.strictEqual(savingRequest.state, 'pending', 'request is pending');
    assert.strictEqual(savingRequest.type, 'mutation', 'request is a mutation');
    const savingRequestOp = {
      op: 'saveRecord',
      recordIdentifier: identifier,
      options: {},
    };
    assert.deepEqual(savingRequest.request.data[0], savingRequestOp, 'request op is correct');

    await savingPromise;
    const lastSavingRequest = requestService.getLastRequestForRecord(identifier);
    const savingRequestStateResult = {
      type: 'mutation' as const,
      state: 'fulfilled' as const,
      request: { data: [savingRequestOp] },
      response: { data: undefined },
    };
    assert.deepEqual(lastSavingRequest, savingRequestStateResult, 'request is correct after fulfilling');
    assert.deepEqual(requestService.getPendingRequestsForRecord(identifier).length, 0, 'no pending requests remaining');
  });

  test('can subscribe to events for an identifier', async function (assert) {
    assert.expect(9);

    const personHash = {
      type: 'person',
      id: '1',
      name: 'Scumbag Dale',
    };

    const normalizedHash = {
      data: {
        type: 'person',
        id: '1',
        lid: '@lid:person-1',
        attributes: {
          name: 'Scumbag Dale',
        },
        relationships: {},
      },
      included: [],
    };

    const { owner } = this;

    const TestAdapter = EmberObject.extend({
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
      },
    });

    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store') as unknown as Store;

    const requestService = store.getRequestStateService();
    // Relying on sequential lids until identifiers land
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    let count = 0;
    const requestOp = {
      op: 'findRecord',
      recordIdentifier: identifier,
      options: {
        reload: true,
      },
    };
    const savingRequestOp = {
      op: 'saveRecord',
      recordIdentifier: identifier,
      options: {},
    };

    requestService.subscribeForRecord(identifier, (request) => {
      if (count === 0) {
        assert.strictEqual(request.state, 'pending', 'request is pending');
        assert.strictEqual(request.type, 'query', 'request is a query');
        assert.deepEqual(request.request.data[0], requestOp, 'request op is correct');
      } else if (count === 1) {
        const requestStateResult = {
          type: 'query' as const,
          state: 'fulfilled' as const,
          request: { data: [requestOp] },
          response: { data: normalizedHash },
        };
        assert.deepEqual(request, requestStateResult, 'request is correct after fulfilling');
      } else if (count === 2) {
        assert.strictEqual(request.state, 'pending', 'request is pending');
        assert.strictEqual(request.type, 'mutation', 'request is a mutation');
        assert.deepEqual(request.request.data[0], savingRequestOp, 'request op is correct');
      } else if (count === 3) {
        const savingRequestStateResult = {
          type: 'mutation' as const,
          state: 'fulfilled' as const,
          request: { data: [savingRequestOp] },
          response: { data: undefined },
        };
        assert.deepEqual(request, savingRequestStateResult, 'request is correct after fulfilling');
      }
      count++;
    });

    const person = (await store.findRecord('person', '1')) as Model;
    await person.save();
    assert.strictEqual(count, 4, 'callback called four times');
  });
});
