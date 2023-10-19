import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

import JSONAPICache from '@ember-data/json-api';
import { updateRecord } from '@ember-data/json-api/request';
import Model, { attr, instantiateRecord, teardownRecord } from '@ember-data/model';
import { buildSchema, modelFor } from '@ember-data/model/hooks';
import type { StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import type { Future, Handler, RequestContext } from '@ember-data/request/-private/types';
import { setBuildURLConfig } from '@ember-data/request-utils';
import DataStore, { CacheHandler, recordIdentifierFor } from '@ember-data/store';
import type { Cache } from '@ember-data/types/cache/cache';
import { SingleResourceDataDocument } from '@ember-data/types/cache/document';
import type { CacheCapabilitiesManager } from '@ember-data/types/q/cache-store-wrapper';
import { SingleResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import { JsonApiError } from '@ember-data/types/q/record-data-json-api';

class TestStore extends DataStore {
  constructor(args: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.useCache(CacheHandler);

    this.registerSchema(buildSchema(this));
  }

  createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs: { [key: string]: unknown }): unknown {
    return instantiateRecord.call(this, identifier, createRecordArgs);
  }

  teardownRecord(record: Model): void {
    return teardownRecord.call(this, record);
  }

  modelFor(type: string) {
    return modelFor.call(this, type);
  }
}

class User extends Model {
  @attr declare name: string;
}

module('Integration - updateRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    setBuildURLConfig({ host: 'https://api.example.com', namespace: 'api/v1' });
  });

  hooks.afterEach(function () {
    setBuildURLConfig({ host: '', namespace: '' });
  });

  test('Saving a record with an updateRecord op works as expected', async function (assert) {
    const { owner } = this;

    // intercept cache APIs to ensure they are called as expected
    class TestCache extends JSONAPICache {
      willCommit(identifier: StableRecordIdentifier): void {
        assert.step(`willCommit ${identifier.lid}`);
        return super.willCommit(identifier);
      }
      didCommit(
        committedIdentifier: StableRecordIdentifier,
        result: StructuredDataDocument<SingleResourceDocument>
      ): SingleResourceDataDocument<StableExistingRecordIdentifier> {
        assert.step(`didCommit ${committedIdentifier.lid}`);
        return super.didCommit(committedIdentifier, result);
      }
      commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[]): void {
        assert.step(`commitWasRejected ${identifier.lid}`);
        return super.commitWasRejected(identifier, errors);
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
      createCache(capabilities: CacheCapabilitiesManager): Cache {
        return new TestCache(capabilities);
      }
    }

    owner.register('service:store', Store);
    owner.register('model:user', User);
    const store = owner.lookup('service:store') as Store;
    const user = store.push({ data: { type: 'user', id: '1', attributes: { name: 'Chris' } } }) as User;
    const identifier = recordIdentifierFor(user);
    assert.false(user.isSaving, 'The user is not saving');
    assert.false(user.isNew, 'The user is not new');
    assert.false(user.hasDirtyAttributes, 'The user is not dirty');

    response = {
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'James Thoburn',
        },
      },
    };

    user.name = 'James';

    assert.true(user.hasDirtyAttributes, 'The user is dirty');
    const promise = store.request(updateRecord(user));
    assert.true(user.isSaving, 'The user is saving');

    await promise;

    assert.equal(user.name, 'James Thoburn', 'The user is updated from the response');
    assert.false(user.hasDirtyAttributes, 'The user is no longer dirty');
    assert.false(user.isSaving, 'The user is no longer saving');

    assert.verifySteps([`willCommit ${identifier.lid}`, 'handle updateRecord request', `didCommit ${identifier.lid}`]);
  });

  test('Rejecting during Save of a new record with a createRecord op works as expected', async function (assert) {
    const { owner } = this;

    // intercept cache APIs to ensure they are called as expected
    class TestCache extends JSONAPICache {
      willCommit(identifier: StableRecordIdentifier): void {
        assert.step(`willCommit ${identifier.lid}`);
        return super.willCommit(identifier);
      }
      didCommit(
        committedIdentifier: StableRecordIdentifier,
        result: StructuredDataDocument<SingleResourceDocument>
      ): SingleResourceDataDocument<StableExistingRecordIdentifier> {
        assert.step(`didCommit ${committedIdentifier.lid}`);
        return super.didCommit(committedIdentifier, result);
      }
      commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[]): void {
        assert.step(`commitWasRejected ${identifier.lid}`);
        return super.commitWasRejected(identifier, errors);
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
      createCache(capabilities: CacheCapabilitiesManager): Cache {
        return new TestCache(capabilities);
      }
    }

    owner.register('service:store', Store);
    owner.register('model:user', User);
    const store = owner.lookup('service:store') as Store;
    const user = store.push({ data: { type: 'user', id: '1', attributes: { name: 'Chris' } } }) as User;
    const identifier = recordIdentifierFor(user);
    assert.false(user.isSaving, 'The user is not saving');
    assert.false(user.isNew, 'The user is not new');
    assert.false(user.hasDirtyAttributes, 'The user is not dirty');

    const validationError: Error & {
      content: { errors: JsonApiError[] };
    } = new Error('Something went wrong') as Error & {
      content: { errors: JsonApiError[] };
    };
    validationError.content = {
      errors: [
        {
          title: 'Name must be capitalized',
          detail: 'Name must be capitalized',
          source: {
            pointer: '/data/attributes/name',
          },
        },
      ],
    };

    response = validationError;

    user.name = 'james';
    assert.true(user.hasDirtyAttributes, 'The user is dirty');

    const promise = store.request(updateRecord(user));
    assert.true(user.isSaving, 'The user is saving');

    try {
      await promise;
      assert.ok(false, 'The promise should reject');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'The error is an error');
      assert.equal((e as Error).message, 'Something went wrong', 'The error has the expected error message');
      assert.true(
        Array.isArray((e as { content: { errors: JsonApiError[] } })?.content?.errors),
        'The error has an errors array'
      );
    }

    assert.true(user.hasDirtyAttributes, 'The user is still dirty');
    assert.false(user.isNew, 'The user is not new');
    assert.false(user.isDeleted, 'The user is not deleted');
    assert.false(user.isDestroying, 'The user is not destroying');
    assert.false(user.isDestroyed, 'The user is not destroyed');
    assert.false(user.isSaving, 'The user is no longer saving');

    const nameErrors = user.errors.get('name') as Array<{
      attribute: string;
      message: string;
    }>;

    assert.equal(nameErrors.length, 1, 'The user has the expected number of errors');
    assert.equal(nameErrors[0]?.message, 'Name must be capitalized', 'The user has the expected error for the field');

    assert.verifySteps([
      `willCommit ${identifier.lid}`,
      'handle updateRecord request',
      `commitWasRejected ${identifier.lid}`,
    ]);
  });
});
