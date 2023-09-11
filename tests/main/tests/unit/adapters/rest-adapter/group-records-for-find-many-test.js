import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import { FetchManager } from '@ember-data/legacy-compat/-private';
import Model from '@ember-data/model';
import RESTSerializer from '@ember-data/serializer/rest';
import { recordIdentifierFor } from '@ember-data/store';

let store, requests;
let maxLength;
let lengths;

module(
  'unit/adapters/rest_adapter/group_records_for_find_many_test - DS.RESTAdapter#groupRecordsForFindMany',
  function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      maxLength = -1;
      requests = [];
      lengths = [];

      class ApplicationAdapter extends RESTAdapter {
        coalesceFindRequests = true;

        findRecord(store, type, id, snapshot) {
          return { id };
        }

        ajax(url, type, options) {
          requests.push({
            url,
            ids: options.data.ids,
          });

          let queryString = options.data.ids
            .map((i) => {
              return 'ids%5B%5D=' + i;
            })
            .join('&');
          let fullUrl = url + '?' + queryString;

          maxLength = this.maxURLLength;
          lengths.push(fullUrl.length);

          let testRecords = options.data.ids.map((id) => ({ id }));
          return Promise.resolve({ testRecords: testRecords });
        }
      }

      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', RESTSerializer.extend());
      this.owner.register('model:test-record', Model.extend());

      store = this.owner.lookup('service:store');
    });

    test('groupRecordsForFindMany - findMany', async function (assert) {
      let wait = [];
      for (let i = 1; i <= 1024; i++) {
        wait.push(store.findRecord('test-record', String(i)));
      }

      assert.ok(
        lengths.every((len) => len <= maxLength),
        `Some URLs are longer than ${maxLength} chars`
      );
      await Promise.all(wait);
    });

    test('groupRecordsForFindMany works for encodeURIComponent-ified ids', async function (assert) {
      let wait = [];
      wait.push(store.findRecord('test-record', 'my-id:1'));
      wait.push(store.findRecord('test-record', 'my-id:2'));

      await settled();

      assert.strictEqual(requests.length, 1);
      assert.strictEqual(requests[0].url, '/testRecords');
      assert.deepEqual(requests[0].ids, ['my-id:1', 'my-id:2']);

      await Promise.all(wait);
    });

    test('_stripIDFromURL works with id being encoded - #4190', function (assert) {
      store._fetchManager = new FetchManager(store);
      let record = store.createRecord('test-record', { id: 'id:123' });
      let adapter = store.adapterFor('test-record');
      let snapshot = store._fetchManager.createSnapshot(recordIdentifierFor(record));
      let strippedUrl = adapter._stripIDFromURL(store, snapshot);

      assert.strictEqual(strippedUrl, '/testRecords/');
    });
  }
);
