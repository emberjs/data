import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPICache from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import type { ImmutableRequestInfo, NextFn, RequestContext, ResponseInfo } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import { CachePolicy } from '@ember-data/request-utils';
import type { NotificationType } from '@ember-data/store';
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager, SchemaService } from '@ember-data/store/types';
import type { RequestKey, ResourceKey } from '@warp-drive/core-types/identifier';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core-types/schema/concepts';
import type {
  ArrayField,
  DerivedField,
  FieldSchema,
  GenericField,
  HashField,
  ObjectField,
  ResourceSchema,
} from '@warp-drive/core-types/schema/fields';
import type { Type } from '@warp-drive/core-types/symbols';

type FakeRecord = { [key: string]: unknown; destroy: () => void };

class BaseTestStore extends Store {
  createSchemaService(): SchemaService {
    const Schemas = new Map<string, ResourceSchema>();
    const schemaService: SchemaService = {
      resourceTypes() {
        return [];
      },
      fields(identifier: ResourceKey | { type: string }): Map<string, FieldSchema> {
        const resource = Schemas.get(identifier.type);
        const fields = new Map<string, FieldSchema>();
        resource?.fields.forEach((field: FieldSchema) => {
          fields.set(field.name, field);
        });
        return fields;
      },
      hasResource(identifier: ResourceKey | { type: string }) {
        return Schemas.has(identifier.type);
      },
      hasTrait: function (type: string): boolean {
        throw new Error('Function not implemented.');
      },
      resourceHasTrait: function (resource: ResourceKey | { type: string }, trait: string): boolean {
        throw new Error('Function not implemented.');
      },
      resource: function (resource: ResourceKey | { type: string }): ResourceSchema {
        return Schemas.get(resource.type)!;
      },
      registerResources: function (schemas: ResourceSchema[]): void {
        schemas.forEach((schema) => {
          schemaService.registerResource(schema);
        });
      },
      registerResource: function (schema: ResourceSchema): void {
        Schemas.set(schema.type, schema);
      },
      registerTransformation: function (transform: Transformation): void {
        throw new Error('Function not implemented.');
      },
      registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void {
        throw new Error('Function not implemented.');
      },
      registerHashFn: function (hashFn: HashFn): void {
        throw new Error('Function not implemented.');
      },
      transformation: function (field: GenericField | ObjectField | ArrayField | { type: string }): Transformation {
        throw new Error('Function not implemented.');
      },
      hashFn: function (field: HashField | { type: string }): HashFn {
        throw new Error('Function not implemented.');
      },
      derivation: function (field: DerivedField | { type: string }): Derivation {
        throw new Error('Function not implemented.');
      },
    };

    schemaService.registerResource({
      type: 'test',
      legacy: true,
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          kind: 'field',
          name: 'name',
        },
      ],
    });

    return schemaService;
  }

  override createCache(wrapper: CacheCapabilitiesManager) {
    return new JSONAPICache(wrapper);
  }

  override instantiateRecord(identifier: ResourceKey) {
    const { id, lid, type } = identifier;
    const record: FakeRecord = { id, lid, type, identifier } as unknown as FakeRecord;
    Object.assign(record, this.cache.peek(identifier)!.attributes);

    const token = this.notifications.subscribe(identifier, (_: ResourceKey, kind: NotificationType, key?: string) => {
      if (kind === 'attributes' && key) {
        record[key] = this.cache.getAttr(identifier, key);
      }
    });

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

  test('@ember-data/request-utils CachePolicy handles createRecord requests', async function (assert) {
    class InterceptLifetimes extends CachePolicy {
      didRequest(
        request: ImmutableRequestInfo,
        response: Response | ResponseInfo | null,
        identifier: RequestKey | null,
        store: Store
      ): void {
        assert.step('didRequest');
        super.didRequest(request, response, identifier, store);
      }
      isHardExpired(identifier: RequestKey, store: Store): boolean {
        const result = super.isHardExpired(identifier, store);
        assert.step(`isHardExpired: ${result}`);
        return result;
      }
      isSoftExpired(identifier: RequestKey, store: Store): boolean {
        const result = super.isSoftExpired(identifier, store);
        assert.step(`isSoftExpired: ${result}`);
        return result;
      }
    }
    const handleIntercept = {
      request<T>(context: RequestContext, _next: NextFn<T>): Promise<T> {
        assert.step('request issued');
        const response = new Response();
        response.headers.set('date', new Date().toUTCString());
        context.setResponse(response);
        return Promise.resolve({ data: { id: '1', type: 'test', attributes: {} } }) as Promise<T>;
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

    const record = store.createRecord<{ identifier: ResourceKey; [Type]: 'test' }>('test', {});

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

  test('@ember-data/request-utils legacy createRecord operations invalidate the CachePolicy type list', async function (assert) {
    class AppAdapter {
      createRecord(
        _store: Store,
        _type: unknown,
        _snapshot: Snapshot
      ): Promise<{ data: { id: string; type: string } }> {
        assert.step('adapter:createRecord');
        return Promise.resolve({ data: { id: '1', type: 'test', attributes: {} } });
      }
    }
    const adapter = new AppAdapter();
    class InterceptLifetimes extends CachePolicy {
      override didRequest(
        request: ImmutableRequestInfo,
        response: Response | ResponseInfo | null,
        identifier: RequestKey | null,
        store: Store
      ): void {
        assert.step('didRequest');
        super.didRequest(request, response, identifier, store);
      }
      override isHardExpired(identifier: RequestKey, store: Store): boolean {
        const result = super.isHardExpired(identifier, store);
        assert.step(`isHardExpired: ${result}`);
        return result;
      }
      override isSoftExpired(identifier: RequestKey, store: Store): boolean {
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

    const record = store.createRecord('test', {});
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

  test('An AdHoc createRecord request can invalidate the request cache via records', async function (assert) {
    class InterceptLifetimes extends CachePolicy {
      override didRequest(
        request: ImmutableRequestInfo,
        response: Response | ResponseInfo | null,
        identifier: RequestKey | null,
        store: Store
      ): void {
        assert.step('didRequest');
        super.didRequest(request, response, identifier, store);
      }
      override isHardExpired(identifier: RequestKey, store: Store): boolean {
        const result = super.isHardExpired(identifier, store);
        assert.step(`isHardExpired: ${result}`);
        return result;
      }
      override isSoftExpired(identifier: RequestKey, store: Store): boolean {
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

    // issue an out of band createRecord request with a record identifier
    const record = store.createRecord<{ identifier: ResourceKey; [Type]: 'test' }>('test', {});
    await store.requestManager.request({
      store,
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

  test('An AdHoc createRecord request can invalidate the request cache via cacheOptions', async function (assert) {
    class InterceptLifetimes extends CachePolicy {
      override didRequest(
        request: ImmutableRequestInfo,
        response: Response | ResponseInfo | null,
        identifier: RequestKey | null,
        store: Store
      ): void {
        assert.step('didRequest');
        super.didRequest(request, response, identifier, store);
      }
      override isHardExpired(identifier: RequestKey, store: Store): boolean {
        const result = super.isHardExpired(identifier, store);
        assert.step(`isHardExpired: ${result}`);
        return result;
      }
      override isSoftExpired(identifier: RequestKey, store: Store): boolean {
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

    // create an out of band createRecord request with no associated identifier
    // but with cacheOptions
    await store.requestManager.request({
      store,
      cacheOptions: {
        types: ['test'],
      },
      url: '/test',
      method: 'POST',
      op: 'createRecord',
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
});
