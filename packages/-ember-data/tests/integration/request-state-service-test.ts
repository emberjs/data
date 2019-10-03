import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { module, test } from 'qunit';
import { identifierCacheFor } from '@ember-data/store/-private';
import EmberObject from '@ember/object';
import { attr } from '@ember-data/model';
import { REQUEST_SERVICE } from '@ember-data/canary-features';
import { RequestStateEnum } from '@ember-data/store/-private/ts-interfaces/fetch-manager';

class Person extends Model {
  // TODO fix the typing for naked attrs
  @attr('string', {})
  name;

  @attr('string', {})
  lastName;
}

if (REQUEST_SERVICE) {
  module('integration/request-state-service - Request State Service', function(hooks) {
    setupTest(hooks);

    let store: Store;

    hooks.beforeEach(function() {
      let { owner } = this;
      owner.register('model:person', Person);
      store = owner.lookup('service:store');
    });

    test('getPendingRequest and getLastRequest return correct inflight and fulfilled requests', async function(assert) {
      assert.expect(10);

      let normalizedHash = {
        data: {
          type: 'person',
          id: '1',
          lid: '',
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

      store = owner.lookup('service:store');

      let promise = store.findRecord('person', '1');
      let requestService = store.getRequestStateService();

      // Relying on sequential lids until identifiers land
      let identifier = identifierCacheFor(store).getOrCreateRecordIdentifier({ type: 'person', id: '1' });
      normalizedHash.data.lid = identifier.lid;
      let request = requestService.getPendingRequestsForRecord(identifier)[0];

      assert.equal(request.state, 'pending', 'request is pending');
      assert.equal(request.type, 'query', 'request is a query');
      let requestOp = {
        op: 'findRecord',
        recordIdentifier: identifier,
        options: {},
      };
      assert.deepEqual(request.request.data[0], requestOp, 'request op is correct');

      let person = await promise;
      let lastRequest = requestService.getLastRequestForRecord(identifier);
      let requestStateResult = {
        type: 'query' as const,
        state: 'fulfilled' as RequestStateEnum,
        request: { data: [requestOp] },
        response: { data: normalizedHash },
      };
      assert.deepEqual(lastRequest, requestStateResult, 'request is correct after fulfilling');
      assert.deepEqual(
        requestService.getPendingRequestsForRecord(identifier).length,
        0,
        'no pending requests remaining'
      );

      let savingPromise = person.save();
      let savingRequest = requestService.getPendingRequestsForRecord(identifier)[0];

      assert.equal(savingRequest.state, 'pending', 'request is pending');
      assert.equal(savingRequest.type, 'mutation', 'request is a mutation');
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
        state: 'fulfilled' as RequestStateEnum,
        request: { data: [savingRequestOp] },
        response: { data: undefined },
      };
      assert.deepEqual(lastSavingRequest, savingRequestStateResult, 'request is correct after fulfilling');
      assert.deepEqual(
        requestService.getPendingRequestsForRecord(identifier).length,
        0,
        'no pending requests remaining'
      );
    });

    test('can subscribe to events for an identifier', async function(assert) {
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

      store = owner.lookup('service:store');

      let requestService = store.getRequestStateService();
      // Relying on sequential lids until identifiers land
      let identifier = identifierCacheFor(store).getOrCreateRecordIdentifier({ type: 'person', id: '1' });
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

      requestService.subscribeForRecord(identifier, request => {
        if (count === 0) {
          assert.equal(request.state, 'pending', 'request is pending');
          assert.equal(request.type, 'query', 'request is a query');
          assert.deepEqual(request.request.data[0], requestOp, 'request op is correct');
        } else if (count === 1) {
          let requestStateResult = {
            type: 'query' as const,
            state: 'fulfilled' as RequestStateEnum,
            request: { data: [requestOp] },
            response: { data: normalizedHash },
          };
          assert.deepEqual(request, requestStateResult, 'request is correct after fulfilling');
        } else if (count === 2) {
          assert.equal(request.state, 'pending', 'request is pending');
          assert.equal(request.type, 'mutation', 'request is a mutation');
          assert.deepEqual(request.request.data[0], savingRequestOp, 'request op is correct');
        } else if (count === 3) {
          let savingRequestStateResult = {
            type: 'mutation' as const,
            state: 'fulfilled' as RequestStateEnum,
            request: { data: [savingRequestOp] },
            response: { data: undefined },
          };
          assert.deepEqual(request, savingRequestStateResult, 'request is correct after fulfilling');
        }
        count++;
      });

      let person = await store.findRecord('person', '1');
      await person.save();
      assert.equal(count, 4, 'callback called four times');
    });
  });
}
