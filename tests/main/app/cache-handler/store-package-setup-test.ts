import { service } from '@ember/service';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Cache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import Store, { CacheHandler } from '@ember-data/store';
import type { SingleResourceDataDocument } from '@ember-data/types/cache/document';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';

module('Store | CacheHandler - setup with @ember-data/store', function (hooks) {
  setupTest(hooks);

  test('When using @ember-data/store, we can use @ember-data/request as a service', async function (assert) {
    const { owner } = this;

    class RequestManagerService extends RequestManager {
      constructor() {
        super(...arguments);
        this.use([LegacyNetworkHandler, Fetch]);
        this.useCache(CacheHandler);
      }
    }

    class TestStore extends Store {
      @service('request') declare requestManager: RequestManager;

      createCache(wrapper: CacheStoreWrapper) {
        return new Cache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    owner.register('service:request', RequestManagerService);

    const store = owner.lookup('service:store') as TestStore;
    const userDocument = await store.request<SingleResourceDataDocument>({
      url: '/assets/demo-fetch.json',
    });

    assert.strictEqual(
      userDocument.content.data,
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' }),
      'we get a stable identifier back as data'
    );

    assert.strictEqual(userDocument.content.lid, '/assets/demo-fetch.json', 'we get back url as the cache key');

    assert.deepEqual(
      userDocument.content.links,
      { self: '/assets/demo-fetch.json' },
      'we get access to the document links'
    );

    assert.deepEqual(
      userDocument.content.meta,
      {
        expiration: 120000,
      },
      'we get access to the document meta'
    );

    const record = store.peekRecord(userDocument.content.data!);
    assert.strictEqual(record?.name, 'Chris Thoburn');
  });
});
