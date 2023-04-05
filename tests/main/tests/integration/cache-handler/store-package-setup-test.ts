import { inject as service } from '@ember/service';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Cache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import type { StructuredDataDocument, StructuredErrorDocument } from '@ember-data/request/-private/types';
import Fetch from '@ember-data/request/fetch';
import Store, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { Document } from '@ember-data/store/-private/document';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type {
  CollectionResourceDataDocument,
  ResourceDataDocument,
  SingleResourceDataDocument,
} from '@ember-data/types/cache/document';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

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

  module('Resource', function () {
    test('fetching a resource document loads the cache and hydrates the record', async function (assert) {
      const { owner } = this;

      const store = owner.lookup('service:store') as TestStore;
      const userDocument = await store.request<Document<RecordInstance>>({
        url: '/assets/users/1.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data;

      assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
      assert.strictEqual(data, record, 'record was returned as data');
      assert.strictEqual(data && recordIdentifierFor(data), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/1.json',
        'we get back url as the cache key'
      );
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

    test('re-fetching a resource document returns from cache as expected', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 0) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links: {
                self: '/assets/users/1.json',
              },
              meta: {
                expiration: 120000,
              },
              data: {
                type: 'user',
                id: '1',
                attributes: {
                  name: 'Chris Thoburn',
                },
              },
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      const userDocument = await store.request<Document<RecordInstance>>({
        url: '/assets/users/1.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data;

      assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
      assert.strictEqual(data, record, 'record was returned as data');
      assert.strictEqual(data && recordIdentifierFor(data), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/1.json',
        'we get back url as the cache key'
      );
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

      const userDocument2 = await store.request<Document<RecordInstance>>({
        url: '/assets/users/1.json',
      });
      const data2 = userDocument2.content.data;

      assert.strictEqual(data2, record, '<Updated> record was returned as data');
      assert.strictEqual(data2 && recordIdentifierFor(data2), identifier, '<Updated> we get a record back as data');
      assert.strictEqual(
        userDocument2.content.identifier?.lid,
        '/assets/users/1.json',
        '<Updated> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/1.json' },
        '<Updated> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
        },
        '<Updated> we get access to the document meta'
      );
      assert.strictEqual(handlerCalls, 1, 'fetch handler should only be called once');
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
      const userDocument = await store.request<Document<RecordInstance>>({
        op: 'random-op',
        url: '/assets/users/1.json',
      });
      const identifier = recordIdentifierFor(userDocument.content.data!);
      const record = store.peekRecord(identifier);
      assert.strictEqual(record?.name, 'Chris Thoburn');
      assert.strictEqual(userDocument.content.data, record, 'we get a hydrated record back as data');

      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/1.json',
        'we get back url as the cache key'
      );

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

    test('background re-fetching a resource returns from cache as expected, updates once complete', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 1) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links:
                handlerCalls === 1
                  ? {
                      self: '/assets/users/1.json',
                    }
                  : {
                      self: '/assets/users/1.json',
                      related: '/assets/users/company/1.json',
                    },
              meta: {
                expiration: 120000,
                total: handlerCalls,
              },
              data:
                handlerCalls === 1
                  ? {
                      type: 'user',
                      id: '1',
                      attributes: {
                        name: 'Chris Thoburn',
                      },
                    }
                  : {
                      type: 'user',
                      id: '2',
                      attributes: {
                        name: 'Wesley Thoburn',
                      },
                    },
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      const userDocument = await store.request<Document<RecordInstance>>({
        url: '/assets/users/1.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data!;

      assert.strictEqual(record?.name, 'Chris Thoburn', '<Initial> record name is correct');
      assert.strictEqual(data, record, '<Initial> record was returned as data');
      assert.strictEqual(data && recordIdentifierFor(data), identifier, '<Initial> we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/1.json',
        '<Initial> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/1.json' },
        '<Initial> we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Initial> we get access to the document meta'
      );

      const userDocument2 = await store.request<Document<RecordInstance>>({
        url: '/assets/users/1.json',
        cacheOptions: { backgroundReload: true },
      });
      const data2 = userDocument2.content.data!;

      assert.strictEqual(data2, record, '<Cached> record was returned as data');
      assert.strictEqual(data2 && recordIdentifierFor(data2), identifier, '<Cached> we get a record back as data');
      assert.strictEqual(
        userDocument2.content.identifier?.lid,
        '/assets/users/1.json',
        '<Cached> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/1.json' },
        '<Cached> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Cached> we get access to the document meta'
      );

      await store._getAllPending();

      const data3 = userDocument2.content.data!;
      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const record2 = store.peekRecord(identifier2);

      assert.strictEqual(record2?.name, 'Wesley Thoburn', '<Updated> record2 name is correct');
      assert.strictEqual(userDocument.content, userDocument2.content, '<Updated> documents are the same');
      assert.strictEqual(data3, record2, '<Updated> record2 was returned as data');
      assert.strictEqual(data3 && recordIdentifierFor(data3), identifier2, '<Updated> we get a record back as data');
      assert.strictEqual(
        userDocument2.content.identifier?.lid,
        '/assets/users/1.json',
        '<Updated> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        {
          related: '/assets/users/company/1.json',
          self: '/assets/users/1.json',
        },
        '<Updated> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 2,
        },
        '<Updated> we get access to the document meta'
      );
      assert.strictEqual(handlerCalls, 2, 'fetch handler should only be called twice');
    });

    test('fetching with hydration, then background re-fetching a resource without hydration returns from cache as expected, updates once complete', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 1) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links:
                handlerCalls === 1
                  ? {
                      self: '/assets/users/1.json',
                    }
                  : {
                      self: '/assets/users/1.json',
                      related: '/assets/users/company/1.json',
                    },
              meta: {
                expiration: 120000,
                total: handlerCalls,
              },
              data:
                handlerCalls === 1
                  ? {
                      type: 'user',
                      id: '1',
                      attributes: {
                        name: 'Chris Thoburn',
                      },
                    }
                  : {
                      type: 'user',
                      id: '2',
                      attributes: {
                        name: 'Wesley Thoburn',
                      },
                    },
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      const userDocument = await store.request<Document<RecordInstance>>({
        url: '/assets/users/1.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data!;

      assert.strictEqual(record?.name, 'Chris Thoburn', '<Initial> record name is correct');
      assert.strictEqual(data, record, '<Initial> record was returned as data');
      assert.strictEqual(data && recordIdentifierFor(data), identifier, '<Initial> we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/1.json',
        '<Initial> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/1.json' },
        '<Initial> we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Initial> we get access to the document meta'
      );

      // Backgrond Re-Fetch without Hydration
      const userDocument2 = await store.requestManager.request<SingleResourceDataDocument>({
        store,
        url: '/assets/users/1.json',
        cacheOptions: { backgroundReload: true },
      });
      const data2 = userDocument2.content.data!;

      assert.strictEqual(data2, identifier, '<Cached> identifier was returned as data');
      assert.strictEqual(
        userDocument2.content.lid,
        '/assets/users/1.json',
        '<Cached> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/1.json' },
        '<Cached> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Cached> we get access to the document meta'
      );

      // Await the Background Re-Fetch
      await store._getAllPending();

      // Assert the initial document was updated
      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const record2 = store.peekRecord(identifier2);

      assert.strictEqual(handlerCalls, 2, 'fetch handler should only be called twice');
      assert.strictEqual(record2?.name, 'Wesley Thoburn', 'record2 name is correct');
      const data3 = userDocument.content.data!;

      assert.strictEqual(record2?.name, 'Wesley Thoburn', '<Updated> record2 name is correct');
      assert.strictEqual(userDocument.content, userDocument.content, '<Updated> documents are the same');
      assert.strictEqual(data3, record2, '<Updated> record2 was returned as data');
      assert.strictEqual(data3 && recordIdentifierFor(data3), identifier2, '<Updated> we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/1.json',
        '<Updated> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        {
          related: '/assets/users/company/1.json',
          self: '/assets/users/1.json',
        },
        '<Updated> we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 2,
        },
        '<Updated> we get access to the document meta'
      );
    });

    test('background re-fetching a resource without hydration returns from cache as expected, updates once complete', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 1) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links:
                handlerCalls === 1
                  ? {
                      self: '/assets/users/1.json',
                    }
                  : {
                      self: '/assets/users/1.json',
                      related: '/assets/users/company/1.json',
                    },
              meta: {
                expiration: 120000,
                total: handlerCalls,
              },
              data:
                handlerCalls === 1
                  ? {
                      type: 'user',
                      id: '1',
                      attributes: {
                        name: 'Chris Thoburn',
                      },
                    }
                  : {
                      type: 'user',
                      id: '2',
                      attributes: {
                        name: 'Wesley Thoburn',
                      },
                    },
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      // Initial Fetch
      const userDocument = await store.requestManager.request<ResourceDataDocument>({
        store,
        url: '/assets/users/1.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data!;

      assert.strictEqual(record?.name, 'Chris Thoburn', '<Initial> record name is correct');
      assert.strictEqual(data, identifier, '<Initial> record was returned as data');
      assert.strictEqual(
        userDocument.content.lid,
        '/assets/users/1.json',
        '<Initial> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/1.json' },
        '<Initial> we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Initial> we get access to the document meta'
      );

      // Trigger the background re-fetch
      const userDocument2 = await store.requestManager.request<ResourceDataDocument>({
        store,
        url: '/assets/users/1.json',
        cacheOptions: { backgroundReload: true },
      });
      const data2 = userDocument2.content.data;

      assert.strictEqual(data2, identifier, '<Cached> identifier was returned as data');
      assert.strictEqual(
        userDocument2.content.lid,
        '/assets/users/1.json',
        '<Cached> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/1.json' },
        '<Cached> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Cached> we get access to the document meta'
      );

      await store._getAllPending();

      const updatedUserDocument = store.cache.peekRequest(
        store.identifierCache.getOrCreateDocumentIdentifier({ url: '/assets/users/1.json' })!
      ) as unknown as StructuredDataDocument<ResourceDataDocument>;
      const data3 = updatedUserDocument?.content?.data;
      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });

      assert.strictEqual(data3, identifier2, 'we get an identifier back as data');
      assert.strictEqual(updatedUserDocument.content.lid, '/assets/users/1.json', 'we get back url as the cache key');
      assert.deepEqual(
        updatedUserDocument.content.links,
        {
          related: '/assets/users/company/1.json',
          self: '/assets/users/1.json',
        },
        'we get access to the document links'
      );
      assert.deepEqual(
        updatedUserDocument.content.meta,
        {
          expiration: 120000,
          total: 2,
        },
        'we get access to the document meta'
      );
      assert.strictEqual(handlerCalls, 2, 'fetch handler should only be called twice');
    });
  });

  module('Collection', function () {
    test('re-fetching a resource collection returns from cache as expected', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 0) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links: {
                self: '/assets/users/list.json',
              },
              meta: {
                expiration: 120000,
                total: 1,
              },
              data: [
                {
                  type: 'user',
                  id: '1',
                  attributes: {
                    name: 'Chris Thoburn',
                  },
                },
              ],
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      const userDocument = await store.request<Document<RecordInstance[]>>({
        url: '/assets/users/list.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data!;

      assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
      assert.true(Array.isArray(data), 'recordArray was returned as data');
      assert.strictEqual(data.length, 1, 'recordArray has one record');
      assert.strictEqual(data[0], record, 'record was returned as data');
      assert.strictEqual(data[0] && recordIdentifierFor(data[0]), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/list.json' },
        'we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        'we get access to the document meta'
      );

      const userDocument2 = await store.request<Document<RecordInstance[]>>({
        url: '/assets/users/list.json',
      });
      const data2 = userDocument2.content.data!;

      assert.true(Array.isArray(data2), 'recordArray was returned as data');
      assert.strictEqual(data2.length, 1, 'recordArray has one record');
      assert.strictEqual(data2[0], record, 'record was returned as data');
      assert.strictEqual(data2[0] && recordIdentifierFor(data2[0]), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument2.content.identifier?.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/list.json' },
        'we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        'we get access to the document meta'
      );
      assert.strictEqual(handlerCalls, 1, 'fetch handler should only be called once');
    });

    test('background re-fetching a resource collection returns from cache as expected, updates once complete', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 1) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links:
                handlerCalls === 1
                  ? {
                      self: '/assets/users/list.json',
                    }
                  : {
                      self: '/assets/users/list.json',
                      related: '/assets/users/page/1.json',
                    },
              meta: {
                expiration: 120000,
                total: handlerCalls,
              },
              data: [
                {
                  type: 'user',
                  id: '1',
                  attributes: {
                    name: 'Chris Thoburn',
                  },
                },
                handlerCalls === 2
                  ? {
                      type: 'user',
                      id: '2',
                      attributes: {
                        name: 'Wesley Thoburn',
                      },
                    }
                  : false,
              ].filter(Boolean),
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      const userDocument = await store.request<Document<RecordInstance[]>>({
        url: '/assets/users/list.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const record = store.peekRecord(identifier);
      const data = userDocument.content.data!;

      assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
      assert.true(Array.isArray(data), 'recordArray was returned as data');
      assert.strictEqual(data.length, 1, 'recordArray has one record');
      assert.strictEqual(data[0], record, 'record was returned as data');
      assert.strictEqual(data[0] && recordIdentifierFor(data[0]), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/list.json' },
        'we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        'we get access to the document meta'
      );

      const userDocument2 = await store.request<Document<RecordInstance[]>>({
        url: '/assets/users/list.json',
        cacheOptions: { backgroundReload: true },
      });
      const data2 = userDocument2.content.data!;

      assert.true(Array.isArray(data2), 'recordArray was returned as data');
      assert.strictEqual(data2.length, 1, 'recordArray has one record');
      assert.strictEqual(data2[0], record, 'record was returned as data');
      assert.strictEqual(data2[0] && recordIdentifierFor(data2[0]), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument2.content.identifier?.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/list.json' },
        'we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        'we get access to the document meta'
      );

      await store._getAllPending();

      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const record2 = store.peekRecord(identifier2);

      assert.strictEqual(record2?.name, 'Wesley Thoburn', 'record2 name is correct');
      assert.strictEqual(data.length, 2, 'recordArray has two records');
      assert.strictEqual(data2[0], record, 'record was returned as data');
      assert.strictEqual(data2[0] && recordIdentifierFor(data2[0]), identifier, 'we get a record back as data');
      assert.strictEqual(data2[1], record2, 'record was returned as data');
      assert.strictEqual(data2[1] && recordIdentifierFor(data2[1]), identifier2, 'we get a record back as data');
      assert.strictEqual(
        userDocument2.content.identifier?.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        {
          related: '/assets/users/page/1.json',
          self: '/assets/users/list.json',
        },
        'we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 2,
        },
        'we get access to the document meta'
      );
      assert.strictEqual(handlerCalls, 2, 'fetch handler should only be called twice');
    });

    test('fetching with hydration, then background re-fetching a resource collection without hydration returns from cache as expected, updates once complete', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 1) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links:
                handlerCalls === 1
                  ? {
                      self: '/assets/users/list.json',
                    }
                  : {
                      self: '/assets/users/list.json',
                      related: '/assets/users/page/1.json',
                    },
              meta: {
                expiration: 120000,
                total: handlerCalls,
              },
              data: [
                {
                  type: 'user',
                  id: '1',
                  attributes: {
                    name: 'Chris Thoburn',
                  },
                },
                handlerCalls === 2
                  ? {
                      type: 'user',
                      id: '2',
                      attributes: {
                        name: 'Wesley Thoburn',
                      },
                    }
                  : false,
              ].filter(Boolean),
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      // Initial Fetch with Hydration
      const userDocument = await store.request<Document<RecordInstance[]>>({
        url: '/assets/users/list.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const data = userDocument.content.data!;
      const record = store.peekRecord(identifier);

      assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
      assert.true(Array.isArray(data), 'recordArray was returned as data');
      assert.strictEqual(data.length, 1, 'recordArray has one record');
      assert.strictEqual(data[0], record, 'record was returned as data');
      assert.strictEqual(data[0] && recordIdentifierFor(data[0]), identifier, 'we get a record back as data');
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/list.json' },
        'we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        'we get access to the document meta'
      );

      // Backgrond Re-Fetch without Hydration
      const userDocument2 = await store.requestManager.request<CollectionResourceDataDocument>({
        store,
        url: '/assets/users/list.json',
        cacheOptions: { backgroundReload: true },
      });
      const data2 = userDocument2.content.data;

      // Assert Immediate Cache Return
      assert.true(Array.isArray(data2), '<Cached> recordArray was returned as data');
      assert.strictEqual(data2.length, 1, '<Cached> recordArray has one record');
      assert.strictEqual(data2[0], identifier, '<Cached> identifier was returned as data');
      assert.strictEqual(
        userDocument2.content.lid,
        '/assets/users/list.json',
        '<Cached> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/list.json' },
        '<Cached> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Cached> we get access to the document meta'
      );

      // Await the Background Re-Fetch
      await store._getAllPending();

      // Assert the initial document was updated
      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const record2 = store.peekRecord(identifier2);

      assert.strictEqual(handlerCalls, 2, 'fetch handler should only be called twice');
      assert.strictEqual(record2?.name, 'Wesley Thoburn', 'record2 name is correct');
      assert.strictEqual(data.length, 2, '<Initial Doc Updated> recordArray has two records');
      assert.strictEqual(data[0], record, '<Initial Doc Updated> record was returned as data');
      assert.strictEqual(
        data[0] && recordIdentifierFor(data[0]),
        identifier,
        '<Initial Doc Updated> we get a record back as data'
      );
      assert.strictEqual(data[1], record2, '<Initial Doc Updated> record was returned as data');
      assert.strictEqual(
        data[1] && recordIdentifierFor(data[1]),
        identifier2,
        '<Initial Doc Updated> we get a record back as data'
      );
      assert.strictEqual(
        userDocument.content.identifier?.lid,
        '/assets/users/list.json',
        '<Initial Doc Updated> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        {
          related: '/assets/users/page/1.json',
          self: '/assets/users/list.json',
        },
        '<Initial Doc Updated> we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 2,
        },
        '<Initial Doc Updated> we get access to the document meta'
      );
    });

    test('background re-fetching a resource collection without hydration returns from cache as expected, updates once complete', async function (assert) {
      const { owner } = this;
      const store = owner.lookup('service:store') as TestStore;

      let handlerCalls = 0;
      store.requestManager = new RequestManager();
      store.requestManager.use([
        LegacyNetworkHandler,
        {
          request<T>() {
            if (handlerCalls > 1) {
              assert.ok(false, 'fetch handler should not be called again');
              throw new Error('fetch handler should not be called again');
            }
            handlerCalls++;
            return Promise.resolve({
              links:
                handlerCalls === 1
                  ? {
                      self: '/assets/users/list.json',
                    }
                  : {
                      self: '/assets/users/list.json',
                      related: '/assets/users/page/1.json',
                    },
              meta: {
                expiration: 120000,
                total: handlerCalls,
              },
              data: [
                {
                  type: 'user',
                  id: '1',
                  attributes: {
                    name: 'Chris Thoburn',
                  },
                },
                handlerCalls === 2
                  ? {
                      type: 'user',
                      id: '2',
                      attributes: {
                        name: 'Wesley Thoburn',
                      },
                    }
                  : false,
              ].filter(Boolean),
            }) as T;
          },
        },
      ]);
      store.requestManager.useCache(CacheHandler);

      const userDocument = await store.requestManager.request<CollectionResourceDataDocument>({
        store,
        url: '/assets/users/list.json',
      });
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const data = userDocument.content.data;

      assert.true(Array.isArray(data), '<Initial> recordArray was returned as data');
      assert.strictEqual(data.length, 1, '<Initial> recordArray has one record');
      assert.strictEqual(data[0], identifier, '<Initial> identifier was returned as data');
      assert.strictEqual(
        userDocument.content.lid,
        '/assets/users/list.json',
        '<Initial> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument.content.links,
        { self: '/assets/users/list.json' },
        '<Initial> we get access to the document links'
      );
      assert.deepEqual(
        userDocument.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Initial> we get access to the document meta'
      );

      // Trigger the background re-fetch
      const userDocument2 = await store.requestManager.request<CollectionResourceDataDocument>({
        store,
        url: '/assets/users/list.json',
        cacheOptions: { backgroundReload: true },
      });
      const data2 = userDocument2.content.data;

      assert.true(Array.isArray(data2), '<Cached> recordArray was returned as data');
      assert.strictEqual(data2.length, 1, '<Cached> recordArray has one record');
      assert.strictEqual(data2[0], identifier, '<Cached> identifier was returned as data');
      assert.strictEqual(
        userDocument2.content.lid,
        '/assets/users/list.json',
        '<Cached> we get back url as the cache key'
      );
      assert.deepEqual(
        userDocument2.content.links,
        { self: '/assets/users/list.json' },
        '<Cached> we get access to the document links'
      );
      assert.deepEqual(
        userDocument2.content.meta,
        {
          expiration: 120000,
          total: 1,
        },
        '<Cached> we get access to the document meta'
      );

      await store._getAllPending();

      const updatedUserDocument = store.cache.peekRequest(
        store.identifierCache.getOrCreateDocumentIdentifier({ url: '/assets/users/list.json' })!
      ) as unknown as StructuredDataDocument<CollectionResourceDataDocument>;
      const data3 = updatedUserDocument?.content?.data;
      const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });

      assert.strictEqual(data3.length, 2, 'recordArray has two records');
      assert.strictEqual(data3[0], identifier, 'we get an identifier back as data');
      assert.strictEqual(data3[1], identifier2, 'second identifier was also returned as data');
      assert.strictEqual(
        updatedUserDocument.content.lid,
        '/assets/users/list.json',
        'we get back url as the cache key'
      );
      assert.deepEqual(
        updatedUserDocument.content.links,
        {
          related: '/assets/users/page/1.json',
          self: '/assets/users/list.json',
        },
        'we get access to the document links'
      );
      assert.deepEqual(
        updatedUserDocument.content.meta,
        {
          expiration: 120000,
          total: 2,
        },
        'we get access to the document meta'
      );
      assert.strictEqual(handlerCalls, 2, 'fetch handler should only be called twice');
    });
  });
});
