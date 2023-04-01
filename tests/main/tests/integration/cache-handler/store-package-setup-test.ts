import { inject as service } from '@ember/service';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Cache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import { StructuredErrorDocument } from '@ember-data/request/-private/types';
import Fetch from '@ember-data/request/fetch';
import Store, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { ResourceDataDocument, SingleResourceDataDocument } from '@ember-data/types/cache/document';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import { JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import { RecordInstance } from '@ember-data/types/q/record-instance';

type FakeRecord = { [key: string]: unknown; destroy: () => void };

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

  instantiateRecord(identifier: StableRecordIdentifier) {
    const { id, lid, type } = identifier;
    const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
    Object.assign(record, (this.cache.peek(identifier) as JsonApiResource).attributes);

    let token = this.notifications.subscribe(
      identifier,
      (_: StableRecordIdentifier, kind: NotificationType, key?: string) => {
        if (kind === 'attributes' && key) {
          record[key] = this.cache.getAttr(identifier, key);
        }
      }
    );

    record.destroy = () => {
      this.notifications.unsubscribe(token);
    };

    return record;
  }

  teardownRecord(record: FakeRecord) {
    record.destroy();
  }
}

function assertIsErrorDocument(assert: Assert, document: unknown): asserts document is StructuredErrorDocument {
  if (
    !document ||
    !(document instanceof Error) ||
    !('error' in document) ||
    !('request' in document) ||
    !('response' in document)
  ) {
    assert.ok(false, `Expected an error document`);
  } else {
    assert.ok(true, 'Expected an error document');
  }
}

module('Store | CacheHandler - @ember-data/store', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('service:store', TestStore);
    owner.register('service:request', RequestManagerService);
  });

  test('fetching a resource document with loads the cache and hydrates the record', async function (assert) {
    const { owner } = this;

    const store = owner.lookup('service:store') as TestStore;
    const userDocument = await store.request<ResourceDataDocument<RecordInstance>>({
      url: '/assets/users/1.json',
    });
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const record = store.peekRecord(identifier);
    const data = userDocument.content.data;

    assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
    assert.strictEqual(data, record, 'record was returned as data');
    assert.strictEqual(data && recordIdentifierFor(data as RecordInstance), identifier, 'we get a record back as data');
    assert.strictEqual(userDocument.content.lid, '/assets/users/1.json', 'we get back url as the cache key');
    assert.deepEqual(
      userDocument.content.links,
      { self: '/assets/users/1.json' },
      'we get access to the document links'
    );
    assert.deepEqual(
      userDocument.content.meta,
      {
        expiration: 120000,
      },
      'we get access to the document meta'
    );
  });

  test('fetching a resource document that errors', async function (assert) {
    const { owner } = this;

    const store = owner.lookup('service:store') as TestStore;
    try {
      await store.request<SingleResourceDataDocument>({
        url: '/assets/users/2.json',
      });
      assert.ok(false, 'we should error');
    } catch (errorDocument: unknown) {
      assertIsErrorDocument(assert, errorDocument);
      assert.true(errorDocument.message.startsWith('[404] Not Found - '), 'We receive the correct error');
      assert.strictEqual(errorDocument.response?.statusText, 'Not Found', 'Correct error code');
      assert.strictEqual(errorDocument.response?.status, 404, 'correct code');
    }
  });

  test('When using @ember-data/store, the cache-handler can hydrate any op code', async function (assert) {
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

      instantiateRecord(identifier: StableRecordIdentifier) {
        const { id, lid, type } = identifier;
        const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
        Object.assign(record, (this.cache.peek(identifier) as JsonApiResource).attributes);

        let token = this.notifications.subscribe(
          identifier,
          (_: StableRecordIdentifier, kind: NotificationType, key?: string) => {
            if (kind === 'attributes' && key) {
              record[key] = this.cache.getAttr(identifier, key);
            }
          }
        );

        record.destroy = () => {
          this.notifications.unsubscribe(token);
        };

        return record;
      }

      teardownRecord(record: FakeRecord) {
        record.destroy();
      }
    }

    owner.register('service:store', TestStore);
    owner.register('service:request', RequestManagerService);

    const store = owner.lookup('service:store') as TestStore;
    const userDocument = await store.request<SingleResourceDataDocument<RecordInstance>>({
      op: 'random-op',
      url: '/assets/users/1.json',
    });
    const identifier = recordIdentifierFor(userDocument.content.data!);
    const record = store.peekRecord(identifier);
    assert.strictEqual(record?.name, 'Chris Thoburn');
    assert.strictEqual(userDocument.content.data, record, 'we get a hydrated record back as data');

    assert.strictEqual(userDocument.content.lid, '/assets/users/1.json', 'we get back url as the cache key');

    assert.deepEqual(
      userDocument.content.links,
      { self: '/assets/users/1.json' },
      'we get access to the document links'
    );

    assert.deepEqual(
      userDocument.content.meta,
      {
        expiration: 120000,
      },
      'we get access to the document meta'
    );
  });

  test('When using @ember-data/store, the cache-handler will cache but not hydrate if the request has the store but does not originate from the store', async function (assert) {
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

      instantiateRecord(identifier: StableRecordIdentifier) {
        const { id, lid, type } = identifier;
        const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
        Object.assign(record, (this.cache.peek(identifier) as JsonApiResource).attributes);

        let token = this.notifications.subscribe(
          identifier,
          (_: StableRecordIdentifier, kind: NotificationType, key?: string) => {
            if (kind === 'attributes' && key) {
              record[key] = this.cache.getAttr(identifier, key);
            }
          }
        );

        record.destroy = () => {
          this.notifications.unsubscribe(token);
        };

        return record;
      }

      teardownRecord(record: FakeRecord) {
        record.destroy();
      }
    }

    owner.register('service:store', TestStore);
    owner.register('service:request', RequestManagerService);

    const store = owner.lookup('service:store') as TestStore;
    const userDocument = await store.requestManager.request<SingleResourceDataDocument>({
      store,
      url: '/assets/users/1.json',
    });

    assert.strictEqual(
      userDocument.content.data,
      store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' }),
      'we get a stable identifier back as data'
    );

    assert.strictEqual(userDocument.content.lid, '/assets/users/1.json', 'we get back url as the cache key');

    assert.deepEqual(
      userDocument.content.links,
      { self: '/assets/users/1.json' },
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

  test('When using @ember-data/store, the cache-handler will neither cache nor hydrate if the request does not originate from the store and no store is included', async function (assert) {
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

      instantiateRecord(identifier: StableRecordIdentifier) {
        const { id, lid, type } = identifier;
        const record: FakeRecord = { id, lid, type } as unknown as FakeRecord;
        Object.assign(record, (this.cache.peek(identifier) as JsonApiResource).attributes);

        let token = this.notifications.subscribe(
          identifier,
          (_: StableRecordIdentifier, kind: NotificationType, key?: string) => {
            if (kind === 'attributes' && key) {
              record[key] = this.cache.getAttr(identifier, key);
            }
          }
        );

        record.destroy = () => {
          this.notifications.unsubscribe(token);
        };

        return record;
      }

      teardownRecord(record: FakeRecord) {
        record.destroy();
      }
    }

    owner.register('service:store', TestStore);
    owner.register('service:request', RequestManagerService);

    const store = owner.lookup('service:store') as TestStore;
    const userDocument = await store.requestManager.request<SingleResourceDataDocument<JsonApiResource>>({
      url: '/assets/users/1.json',
    });

    assert.deepEqual(
      userDocument.content.data,
      {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
      'we the raw json back as data'
    );

    assert.strictEqual(userDocument.content.lid, undefined, 'no cache key was set');

    assert.deepEqual(
      userDocument.content.links,
      { self: '/assets/users/1.json' },
      'we get access to the document links'
    );

    assert.deepEqual(
      userDocument.content.meta,
      {
        expiration: 120000,
      },
      'we get access to the document meta'
    );

    const record = store.peekRecord(userDocument.content.data as ResourceIdentifierObject);
    assert.strictEqual(record, null, 'we did not get inserted into the cache');
  });
});
