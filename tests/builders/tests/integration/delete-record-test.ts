import type { TestContext } from '@ember/test-helpers';

import JSONAPICache from '@ember-data/json-api';
import { deleteRecord } from '@ember-data/json-api/request';
import Model, { attr, buildSchema, instantiateRecord, modelFor, teardownRecord } from '@ember-data/model';
import type { Future, Handler, RequestContext, StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import { setBuildURLConfig } from '@ember-data/request-utils';
import DataStore, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager, ModelSchema } from '@ember-data/store/types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ResourceKey } from '@warp-drive/core-types/identifier';
import type { CollectionResourceDataDocument, SingleResourceDataDocument } from '@warp-drive/core-types/spec/document';
import type { ApiError } from '@warp-drive/core-types/spec/error';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

class TestStore extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.useCache(CacheHandler);
  }

  createSchemaService(): ReturnType<typeof buildSchema> {
    return buildSchema(this);
  }

  override createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  override instantiateRecord(key: ResourceKey, createRecordArgs: { [key: string]: unknown }): unknown {
    return instantiateRecord.call(this, key, createRecordArgs);
  }

  override teardownRecord(record: Model): void {
    return teardownRecord.call(this, record);
  }

  override modelFor(type: string): ModelSchema {
    return modelFor.call(this, type) as ModelSchema;
  }
}

class User extends Model {
  @attr declare name: string;
}

module('Integration - deleteRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    setBuildURLConfig({ host: 'https://api.example.com', namespace: 'api/v1' });
  });

  hooks.afterEach(function () {
    setBuildURLConfig({ host: '', namespace: '' });
  });

  test('Persisting deletion for a record with a deleteRecord op works as expected', async function (this: TestContext, assert) {
    const { owner } = this;

    // intercept cache APIs to ensure they are called as expected
    class TestCache extends JSONAPICache {
      override willCommit(key: ResourceKey): void {
        assert.step(`willCommit ${key.lid}`);
        return super.willCommit(key, null);
      }
      didCommit(
        cacheKey: ResourceKey,
        result: StructuredDataDocument<SingleResourceDataDocument> | null
      ): SingleResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey[],
        result: StructuredDataDocument<SingleResourceDataDocument> | null
      ): SingleResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey[],
        result: StructuredDataDocument<CollectionResourceDataDocument> | null
      ): CollectionResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey | ResourceKey[],
        result: StructuredDataDocument<SingleResourceDataDocument | CollectionResourceDataDocument> | null
      ): CollectionResourceDataDocument | SingleResourceDataDocument {
        assert.step(`didCommit ${Array.isArray(cacheKey) ? cacheKey.map((k) => k.lid).join(',') : cacheKey.lid}`);
        // @ts-expect-error TS doesn't handle overload forwarding
        return super.didCommit(cacheKey, result);
      }
      commitWasRejected(cacheKey: ResourceKey | ResourceKey[], errors?: ApiError[]): void {
        assert.step(
          `commitWasRejected ${Array.isArray(cacheKey) ? cacheKey.map((k) => k.lid).join(',') : cacheKey.lid}`
        );
        return super.commitWasRejected(cacheKey, errors);
      }
    }

    // intercept Handler APIs to ensure they are called as expected
    // eslint-disable-next-line prefer-const
    let response: unknown;
    const TestHandler: Handler = {
      request<T>(context: RequestContext): Promise<T | StructuredDataDocument<T>> | Future<T> {
        assert.step(`handle ${context.request.op} request`);
        assert.ok(response, 'response is set');

        if (response instanceof Error) {
          throw response;
        }
        return Promise.resolve(response as T);
      },
    };

    class Store extends TestStore {
      constructor(args: unknown) {
        super(args);
        const manager = this.requestManager;
        manager.use([TestHandler]);
      }
      override createCache(capabilities: CacheCapabilitiesManager): Cache {
        return new TestCache(capabilities);
      }
    }

    owner.register('service:store', Store);
    owner.register('model:user', User);
    const store = owner.lookup('service:store') as Store;
    const user = store.push({ data: { type: 'user', id: '1', attributes: { name: 'Chris' } } }) as User;
    const key = recordIdentifierFor(user);
    assert.false(user.isSaving, 'The user is not saving');
    assert.false(user.isDeleted, 'The user is not deleted');
    assert.false(user.hasDirtyAttributes, 'The user is not dirty');

    // our delete response will include some sideloaded data
    // to ensure it is properly handled
    response = {
      included: [
        {
          id: '2',
          type: 'user',
          attributes: {
            name: 'John',
          },
        },
      ],
    };

    store.deleteRecord(user);

    assert.true(user.isDeleted, 'The user is deleted');
    assert.false(user.isSaving, 'The user is not saving');
    assert.true(user.hasDirtyAttributes, 'The user is dirty');
    assert.equal(user.currentState.stateName, 'root.deleted.uncommitted', 'The user is in the correct state');
    assert.equal(user.dirtyType, 'deleted', 'The user is dirty with the correct type');

    const promise = store.request(deleteRecord(user));
    assert.true(user.isSaving, 'The user is saving');

    await promise;

    assert.false(user.hasDirtyAttributes, 'The user is not dirty');
    assert.equal(user.currentState.stateName, 'root.deleted.saved', 'The user is in the correct state');
    assert.equal(user.dirtyType, '', 'The user is no longer dirty');
    assert.true(user.isDeleted, 'The user is deleted');
    assert.false(user.isSaving, 'The user is no longer saving');

    assert.verifySteps([`willCommit ${key.lid}`, 'handle deleteRecord request', `didCommit ${key.lid}`]);

    const user2 = store.peekRecord('user', '2') as User;
    assert.notEqual(user2, null, 'The user is in the store');
    assert.equal(user2?.name, 'John', 'The user has the expected name');
  });

  test('Rejecting while persisting a deletion with a deleteRecord op works as expected', async function (this: TestContext, assert) {
    const { owner } = this;

    // intercept cache APIs to ensure they are called as expected
    class TestCache extends JSONAPICache {
      override willCommit(key: ResourceKey): void {
        assert.step(`willCommit ${key.lid}`);
        return super.willCommit(key, null);
      }
      didCommit(
        cacheKey: ResourceKey,
        result: StructuredDataDocument<SingleResourceDataDocument> | null
      ): SingleResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey[],
        result: StructuredDataDocument<SingleResourceDataDocument> | null
      ): SingleResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey[],
        result: StructuredDataDocument<CollectionResourceDataDocument> | null
      ): CollectionResourceDataDocument;
      didCommit(
        cacheKey: ResourceKey | ResourceKey[],
        result: StructuredDataDocument<SingleResourceDataDocument | CollectionResourceDataDocument> | null
      ): CollectionResourceDataDocument | SingleResourceDataDocument {
        assert.step(`didCommit ${Array.isArray(cacheKey) ? cacheKey.map((k) => k.lid).join(',') : cacheKey.lid}`);
        // @ts-expect-error TS doesn't handle overload forwarding
        return super.didCommit(cacheKey, result);
      }
      commitWasRejected(cacheKey: ResourceKey | ResourceKey[], errors?: ApiError[]): void {
        assert.step(
          `commitWasRejected ${Array.isArray(cacheKey) ? cacheKey.map((k) => k.lid).join(',') : cacheKey.lid}`
        );
        return super.commitWasRejected(cacheKey, errors);
      }
    }

    // intercept Handler APIs to ensure they are called as expected
    let response: unknown;
    const TestHandler: Handler = {
      request<T>(context: RequestContext): Promise<T | StructuredDataDocument<T>> | Future<T> {
        assert.step(`handle ${context.request.op} request`);
        assert.ok(response, 'response is set');

        if (response instanceof Error) {
          throw response;
        }
        return Promise.resolve(response as T);
      },
    };

    class Store extends TestStore {
      constructor(args: unknown) {
        super(args);
        const manager = this.requestManager;
        manager.use([TestHandler]);
      }
      override createCache(capabilities: CacheCapabilitiesManager): Cache {
        return new TestCache(capabilities);
      }
    }

    owner.register('service:store', Store);
    owner.register('model:user', User);
    const store = owner.lookup('service:store') as Store;
    const user = store.push({ data: { type: 'user', id: '1', attributes: { name: 'Chris' } } }) as User;
    const key = recordIdentifierFor(user);
    assert.false(user.isSaving, 'The user is not saving');
    assert.false(user.isDeleted, 'The user is not deleted');
    assert.false(user.hasDirtyAttributes, 'The user is not dirty');

    // our delete response will include some sideloaded data
    // to ensure it is properly handled
    response = {
      included: [
        {
          id: '2',
          type: 'user',
          attributes: {
            name: 'John',
          },
        },
      ],
    };

    store.deleteRecord(user);

    assert.true(user.isDeleted, 'The user is deleted');
    assert.false(user.isSaving, 'The user is not saving');
    assert.true(user.hasDirtyAttributes, 'The user is dirty');
    assert.equal(user.currentState.stateName, 'root.deleted.uncommitted', 'The user is in the correct state');
    assert.equal(user.dirtyType, 'deleted', 'The user is dirty with the correct type');

    const validationError: Error & {
      content: { errors: ApiError[] };
    } = new Error('405 | Not Authorized') as Error & {
      content: { errors: ApiError[] };
    };
    validationError.content = {
      errors: [
        {
          title: 'Not Authorized',
          detail: 'Not Authorized',
          source: {
            pointer: '/data',
          },
        },
      ],
    };

    response = validationError;

    const promise = store.request(deleteRecord(user));
    assert.true(user.isSaving, 'The user is saving');

    try {
      await promise;
      assert.ok(false, 'The promise should reject');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'The error is an error');
      assert.equal((e as Error).message, '405 | Not Authorized', 'The error has the expected error message');
      assert.true(
        Array.isArray((e as { content: { errors: ApiError[] } })?.content?.errors),
        'The error has an errors array'
      );
    }

    assert.false(user.isDestroying, 'The user is not destroying');
    assert.false(user.isDestroyed, 'The user is not destroyed');
    assert.true(user.hasDirtyAttributes, 'The user is still dirty');
    assert.equal(user.currentState.stateName, 'root.deleted.invalid', 'The user is in the correct state');
    assert.equal(user.dirtyType, 'deleted', 'The user is still dirty');
    assert.equal(
      (user.adapterError as Error)?.message,
      '405 | Not Authorized',
      'The user has the expected error message'
    );
    assert.true(user.isDeleted, 'The user is still deleted');
    assert.false(user.isSaving, 'The user is no longer saving');

    assert.verifySteps([`willCommit ${key.lid}`, 'handle deleteRecord request', `commitWasRejected ${key.lid}`]);
  });
});
