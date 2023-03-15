import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { Cache } from '@ember-data/json-api';
import Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type {
  CollectionResourceDataDocument,
  SingleResourceDataDocument,
  StructuredDocument,
} from '@ember-data/types/cache/document';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { DSModel } from '@ember-data/types/q/ds-model';
import type { CollectionResourceDocument, SingleResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import { JsonApiResource } from '@ember-data/types/q/record-data-json-api';

type FakeRecord = { [key: string]: unknown; destroy: () => void };
class TestStore extends Store {
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

module('Integration | @ember-data/json-api Cache', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', TestStore);
  });

  test('simple single resource documents are correctly managed', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');
  });

  test('simple collection resource documents are correctly managed', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: [
          { type: 'user', id: '1', attributes: { name: 'Chris' } },
          { type: 'user', id: '2', attributes: { name: 'Wesley' } },
        ],
      },
    } as StructuredDocument<CollectionResourceDocument>) as CollectionResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });

    assert.deepEqual(responseDocument.data, [identifier, identifier2], 'We were given the correct data back');
  });

  test('single resource documents are correctly cached', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      request: { url: 'https://api.example.com/v1/users/1' },
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest({ lid: 'https://api.example.com/v1/users/1' });
    assert.deepEqual(
      structuredDocument,
      {
        request: { url: 'https://api.example.com/v1/users/1' },
        content: {
          lid: 'https://api.example.com/v1/users/1',
          data: identifier,
        },
      },
      'We got the cached structured document back'
    );
    const cachedResponse = store.cache.peek({ lid: 'https://api.example.com/v1/users/1' });
    assert.deepEqual(
      cachedResponse,
      {
        lid: 'https://api.example.com/v1/users/1',
        data: identifier,
      },
      'We got the cached response document back'
    );
  });

  test('collection resource documents are correctly cached', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      request: { url: 'https://api.example.com/v1/users' },
      content: {
        data: [
          { type: 'user', id: '1', attributes: { name: 'Chris' } },
          { type: 'user', id: '2', attributes: { name: 'Wesley' } },
        ],
      },
    } as StructuredDocument<CollectionResourceDocument>) as CollectionResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const identifier2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });

    assert.deepEqual(responseDocument.data, [identifier, identifier2], 'We were given the correct data back');

    const structuredDocument = store.cache.peekRequest({ lid: 'https://api.example.com/v1/users' });
    assert.deepEqual(
      structuredDocument,
      {
        request: { url: 'https://api.example.com/v1/users' },
        content: {
          lid: 'https://api.example.com/v1/users',
          data: [identifier, identifier2],
        },
      },
      'We got the cached structured document back'
    );
    const cachedResponse = store.cache.peek({ lid: 'https://api.example.com/v1/users' });
    assert.deepEqual(
      cachedResponse,
      {
        lid: 'https://api.example.com/v1/users',
        data: [identifier, identifier2],
      },
      'We got the cached response document back'
    );
  });

  test('resources are accessible via `peek`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');

    let resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'Chris' } },
      'We can fetch from the cache'
    );

    const record = store.peekRecord(identifier) as DSModel;

    assert.strictEqual(record.name, 'Chris', 'record name is correct');

    store.cache.setAttr(identifier, 'name', 'James');
    resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'James' } },
      'Resource Blob is kept updated in the cache after mutation'
    );

    store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { username: '@runspired' } },
      },
    } as StructuredDocument<SingleResourceDocument>);

    resourceData = store.cache.peek(identifier);
    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'James', username: '@runspired' } },
      'Resource Blob is kept updated in the cache after additional put'
    );

    store.cache.rollbackAttrs(identifier);
    resourceData = store.cache.peek(identifier);
    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'Chris', username: '@runspired' } },
      'Resource Blob is kept updated in the cache after rollback'
    );
  });

  test('single resource relationships are accessible via `peek`', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');

    let resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'Chris' } },
      'We can fetch from the cache'
    );

    const record = store.peekRecord(identifier) as DSModel;

    assert.strictEqual(record.name, 'Chris', 'record name is correct');

    store.cache.setAttr(identifier, 'name', 'James');
    resourceData = store.cache.peek(identifier);

    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'James' } },
      'Resource Blob is kept updated in the cache after mutation'
    );

    store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { username: '@runspired' } },
      },
    } as StructuredDocument<SingleResourceDocument>);

    resourceData = store.cache.peek(identifier);
    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'James', username: '@runspired' } },
      'Resource Blob is kept updated in the cache after additional put'
    );

    store.cache.rollbackAttrs(identifier);
    resourceData = store.cache.peek(identifier);
    assert.deepEqual(
      resourceData,
      { type: 'user', id: '1', lid: '@lid:user-1', attributes: { name: 'Chris', username: '@runspired' } },
      'Resource Blob is kept updated in the cache after rollback'
    );
  });
});
