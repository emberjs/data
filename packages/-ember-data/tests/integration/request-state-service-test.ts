import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import type Store from '@ember-data/store';
import type { DSModel } from '@ember-data/types/q/ds-model';

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
    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('serializer:application', JSONSerializer);
    store = owner.lookup('service:store') as Store;
  });

  test('getPendingRequest and getLastRequest return correct inflight and fulfilled requests', async function (assert) {
    assert.expect(10);

    let normalizedHash = {
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

    let { owner } = this;

    let TestAdapter = EmberObject.extend({
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

    store = owner.lookup('service:store') as Store;

    let promise = store.findRecord('person', '1');
    let requestService = store.getRequestStateService();

    // Relying on sequential lids until identifiers land
    let identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    normalizedHash.data.lid = identifier.lid;
    let request = requestService.getPendingRequestsForRecord(identifier)[0];

    assert.strictEqual(request.state, 'pending', 'request is pending');
    assert.strictEqual(request.type, 'query', 'request is a query');
    let requestOp = {
      op: 'findRecord',
      recordIdentifier: identifier,
      options: {},
    };
    assert.deepEqual(request.request.data[0], requestOp, 'request op is correct');

    let person = (await promise) as DSModel;
    let lastRequest = requestService.getLastRequestForRecord(identifier);
    let requestStateResult = {
      type: 'query' as const,
      state: 'fulfilled' as const,
      request: { data: [requestOp] },
      response: { data: normalizedHash },
    };
    assert.deepEqual(lastRequest, requestStateResult, 'request is correct after fulfilling');
    assert.deepEqual(requestService.getPendingRequestsForRecord(identifier).length, 0, 'no pending requests remaining');

    let savingPromise = person.save();
    let savingRequest = requestService.getPendingRequestsForRecord(identifier)[0];

    assert.strictEqual(savingRequest.state, 'pending', 'request is pending');
    assert.strictEqual(savingRequest.type, 'mutation', 'request is a mutation');
    let savingRequestOp = {
      op: 'saveRecord',
      recordIdentifier: identifier,
      options: {},
    };
    assert.deepEqual(savingRequest.request.data[0], savingRequestOp, 'request op is correct');

    await savingPromise;
    let lastSavingRequest = requestService.getLastRequestForRecord(identifier);
    let savingRequestStateResult = {
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

    let normalizedHash = {
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
      },
    });

    owner.register('adapter:application', TestAdapter, { singleton: false });

    store = owner.lookup('service:store') as Store;

    let requestService = store.getRequestStateService();
    // Relying on sequential lids until identifiers land
    let identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    let count = 0;
    let requestOp = {
      op: 'findRecord',
      recordIdentifier: identifier,
      options: {},
    };
    let savingRequestOp = {
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

    let person = (await store.findRecord('person', '1')) as DSModel;
    await person.save();
    assert.strictEqual(count, 4, 'callback called four times');
  });
});
