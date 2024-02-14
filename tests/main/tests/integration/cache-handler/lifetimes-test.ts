import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPICache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import type { ImmutableRequestInfo, NextFn, RequestContext, ResponseInfo } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import { LifetimesService } from '@ember-data/request-utils';
import Store, { CacheHandler } from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';
import type { JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import type { Cache } from '@warp-drive/core-types/cache';
import type { StableDocumentIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';

type FakeRecord = { [key: string]: unknown; destroy: () => void };

class BaseTestStore extends Store {
  constructor() {
    super(...arguments);
    this.registerSchema({
      attributesDefinitionFor() {
        return {};
      },
      fields(identifier: StableRecordIdentifier | { type: string }): Map<string, FieldSchema> {
        return new Map();
      },
      relationshipsDefinitionFor() {
        return {};
      },
      doesTypeExist() {
        return true;
      },
    });
  }

  override createCache(wrapper: CacheCapabilitiesManager) {
    return new JSONAPICache(wrapper);
  }

  override instantiateRecord(identifier: StableRecordIdentifier) {
    const { id, lid, type } = identifier;
    const record: FakeRecord = { id, lid, type, identifier } as unknown as FakeRecord;
    Object.assign(record, (this.cache.peek(identifier) as JsonApiResource).attributes);

    const token = this.notifications.subscribe(
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

  override teardownRecord(record: FakeRecord) {
    record.destroy();
  }
}

module('Store | CacheHandler + Lifetimes', function (hooks) {
  setupTest(hooks);

  test('willRequest and didRequest are not called when not present', async function (assert) {
    const lifetimeIntercept = {
      isHardExpired() {
        assert.step('isHardExpired');
        return false;
      },
      isSoftExpired() {
        assert.step('isSoftExpired');
        return false;
      },
    };
    const handleIntercept = {
      request<T>(_context: RequestContext, _next: NextFn<T>): Promise<T> {
        assert.step('request issued');
        return Promise.resolve({ data: { id: '1', type: 'test' } }) as Promise<T>;
      },
    };
    class TestStore extends BaseTestStore {
      constructor() {
        super();
        this.requestManager = new RequestManager();
        this.requestManager.useCache(CacheHandler);
        this.requestManager.use([handleIntercept]);
        this.lifetimes = lifetimeIntercept;
      }
    }

    const store = new TestStore();
    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
    });
    assert.verifySteps(['request issued']);

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
    });

    assert.verifySteps(['isHardExpired', 'isSoftExpired']);
  });

  test('willRequest is called if present', async function (assert) {
    const lifetimeIntercept = {
      willRequest() {
        assert.step('willRequest');
      },
      isHardExpired() {
        assert.step('isHardExpired');
        return false;
      },
      isSoftExpired() {
        assert.step('isSoftExpired');
        return false;
      },
    };
    const handleIntercept = {
      request<T>(_context: RequestContext, _next: NextFn<T>): Promise<T> {
        assert.step('request issued');
        return Promise.resolve({ data: { id: '1', type: 'test' } }) as Promise<T>;
      },
    };
    class TestStore extends BaseTestStore {
      constructor() {
        super();
        this.requestManager = new RequestManager();
        this.requestManager.useCache(CacheHandler);
        this.requestManager.use([handleIntercept]);
        this.lifetimes = lifetimeIntercept;
      }
    }

    const store = new TestStore();
    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
    });
    assert.verifySteps(['willRequest', 'request issued']);

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
    });

    assert.verifySteps(['isHardExpired', 'isSoftExpired']);
  });

  test('didRequest is called if present', async function (assert) {
    const lifetimeIntercept = {
      didRequest() {
        assert.step('didRequest');
      },
      isHardExpired() {
        assert.step('isHardExpired');
        return false;
      },
      isSoftExpired() {
        assert.step('isSoftExpired');
        return false;
      },
    };
    const handleIntercept = {
      request<T>(_context: RequestContext, _next: NextFn<T>): Promise<T> {
        assert.step('request issued');
        return Promise.resolve({ data: { id: '1', type: 'test' } }) as Promise<T>;
      },
    };
    class TestStore extends BaseTestStore {
      constructor() {
        super();
        this.requestManager = new RequestManager();
        this.requestManager.useCache(CacheHandler);
        this.requestManager.use([handleIntercept]);
        this.lifetimes = lifetimeIntercept;
      }
    }

    const store = new TestStore();
    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
    });
    assert.verifySteps(['request issued', 'didRequest']);

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
    });

    assert.verifySteps(['isHardExpired', 'isSoftExpired']);
  });

  test('@ember-data/request-utils LifetimesService handles createRecord requests', async function (assert) {
    class InterceptLifetimes extends LifetimesService {
      override didRequest(
        request: ImmutableRequestInfo,
        response: Response | ResponseInfo | null,
        identifier: StableDocumentIdentifier | null,
        store: { cache: Cache }
      ): void {
        assert.step('didRequest');
        super.didRequest(request, response, identifier, store);
      }
      override isHardExpired(identifier: StableDocumentIdentifier, store: Store): boolean {
        const result = super.isHardExpired(identifier, store);
        assert.step(`isHardExpired: ${result}`);
        return result;
      }
      override isSoftExpired(identifier: StableDocumentIdentifier, store: Store): boolean {
        const result = super.isSoftExpired(identifier, store);
        assert.step(`isSoftExpired: ${result}`);
        if (result) {
          // debugger;
          super.isSoftExpired(identifier, store);
        }
        return result;
      }
    }
    const handleIntercept = {
      request<T>(context: RequestContext, _next: NextFn<T>): Promise<T> {
        assert.step('request issued');
        const response = new Response();
        response.headers.set('date', new Date().toUTCString());
        context.setResponse(response);
        return Promise.resolve({ data: { id: '1', type: 'test' } }) as Promise<T>;
      },
    };
    class TestStore extends BaseTestStore {
      constructor() {
        super();
        this.requestManager = new RequestManager();
        this.requestManager.useCache(CacheHandler);
        this.requestManager.use([handleIntercept]);
        this.lifetimes = new InterceptLifetimes({
          apiCacheHardExpires: 4_000,
          apiCacheSoftExpires: 2_000,
        });
      }
    }

    const store = new TestStore();
    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });
    assert.verifySteps(['request issued', 'didRequest'], 'we issue the request');

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(['isHardExpired: false', 'isSoftExpired: false'], 'we resolve from cache');

    await store.request({
      url: '/test/2',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(['request issued', 'didRequest'], 'we issue the request since it is a different request');

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(['isHardExpired: false', 'isSoftExpired: false'], 'we resolve from cache still');

    const record = store.createRecord('test', {}) as { identifier: StableRecordIdentifier };

    await store.request({
      url: '/test',
      method: 'POST',
      op: 'createRecord',
      records: [record.identifier],
    });

    assert.verifySteps(['request issued', 'didRequest'], 'we issue the request since it is a different request');

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: true', 'request issued', 'didRequest'],
      'we are hard expired due to the createRecord response'
    );

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: false', 'isSoftExpired: false'],
      'we are no longer hard expired due to the createRecord response'
    );

    await store.request({
      url: '/test/2',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: true', 'request issued', 'didRequest'],
      'we are hard expired due to the createRecord response'
    );

    await store.request({
      url: '/test/2',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: false', 'isSoftExpired: false'],
      'we are no longer hard expired due to the createRecord response'
    );
  });

  test('@ember-data/request-utils legacy createRecord operations invalidate the LifetimesService type list', async function (assert) {
    class AppAdapter {
      createRecord(
        _store: Store,
        _type: unknown,
        _snapshot: Snapshot
      ): Promise<{ data: { id: string; type: string } }> {
        assert.step('adapter:createRecord');
        return Promise.resolve({ data: { id: '1', type: 'test' } });
      }
    }
    const adapter = new AppAdapter();
    class InterceptLifetimes extends LifetimesService {
      override didRequest(
        request: ImmutableRequestInfo,
        response: Response | ResponseInfo | null,
        identifier: StableDocumentIdentifier | null,
        store: { cache: Cache }
      ): void {
        assert.step('didRequest');
        super.didRequest(request, response, identifier, store);
      }
      override isHardExpired(identifier: StableDocumentIdentifier, store: Store): boolean {
        const result = super.isHardExpired(identifier, store);
        assert.step(`isHardExpired: ${result}`);
        return result;
      }
      override isSoftExpired(identifier: StableDocumentIdentifier, store: Store): boolean {
        const result = super.isSoftExpired(identifier, store);
        assert.step(`isSoftExpired: ${result}`);
        if (result) {
          // debugger;
          super.isSoftExpired(identifier, store);
        }
        return result;
      }
    }
    const handleIntercept = {
      request<T>(context: RequestContext, _next: NextFn<T>): Promise<T> {
        assert.step('request issued');
        const response = new Response();
        response.headers.set('date', new Date().toUTCString());
        context.setResponse(response);
        return Promise.resolve({ data: { id: '1', type: 'test' } }) as Promise<T>;
      },
    };
    class TestStore extends BaseTestStore {
      constructor() {
        super();
        this.requestManager = new RequestManager();
        this.requestManager.useCache(CacheHandler);
        this.requestManager.use([LegacyNetworkHandler, handleIntercept]);
        this.lifetimes = new InterceptLifetimes({
          apiCacheHardExpires: 4_000,
          apiCacheSoftExpires: 2_000,
        });
      }
      adapterFor() {
        return adapter;
      }
      serializerFor() {
        return null;
      }
    }

    const store = new TestStore();
    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });
    assert.verifySteps(['request issued', 'didRequest'], 'we issue the request');

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(['isHardExpired: false', 'isSoftExpired: false'], 'we resolve from cache');

    await store.request({
      url: '/test/2',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(['request issued', 'didRequest'], 'we issue the request since it is a different request');

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(['isHardExpired: false', 'isSoftExpired: false'], 'we resolve from cache still');

    const record = store.createRecord('test', {}) as { identifier: StableRecordIdentifier };
    await store.saveRecord(record);

    assert.verifySteps(['adapter:createRecord', 'didRequest'], 'we issue the request since it is a different request');

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: true', 'request issued', 'didRequest'],
      'we are hard expired due to the createRecord response'
    );

    await store.request({
      url: '/test/1',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: false', 'isSoftExpired: false'],
      'we are no longer hard expired due to the createRecord response'
    );

    await store.request({
      url: '/test/2',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: true', 'request issued', 'didRequest'],
      'we are hard expired due to the createRecord response'
    );

    await store.request({
      url: '/test/2',
      method: 'GET',
      op: 'query',
      cacheOptions: {
        types: ['test'],
      },
    });

    assert.verifySteps(
      ['isHardExpired: false', 'isSoftExpired: false'],
      'we are no longer hard expired due to the createRecord response'
    );
  });
});
