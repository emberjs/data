import { CacheHandler as StoreHandler, Fetch, RequestManager, Store as DataStore } from '@warp-drive/core';
import { DEBUG, PRODUCTION } from '@warp-drive/core/build-config/env';
import {
  instantiateRecord,
  registerDerivations,
  SchemaService,
  teardownRecord,
  withDefaults,
} from '@warp-drive/core/reactive';
import type { CacheHandler, Future, NextFn } from '@warp-drive/core/request';
import { getRequestState, signal } from '@warp-drive/core/store/-private';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { Cache } from '@warp-drive/core/types/cache';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { RequestContext, StructuredDataDocument } from '@warp-drive/core/types/request';
import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { Type } from '@warp-drive/core/types/symbols';
import { setupOnError } from '@warp-drive/diagnostic';
import { spec, type SpecTest, type SuiteBuilder } from '@warp-drive/diagnostic/spec';
import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { JSONAPICache } from '@warp-drive/json-api';
import { buildBaseURL } from '@warp-drive/utilities';

type User = {
  id: string;
  name: string;
  [Type]: 'user';
};

class Store extends DataStore {
  constructor(args?: unknown) {
    super(args);

    const manager = (this.requestManager = new RequestManager());
    manager.use([Fetch]);
    manager.useCache(StoreHandler);
  }

  createSchemaService(): SchemaService {
    const schema = new SchemaService();
    registerDerivations(schema);
    schema.registerResource(
      withDefaults({
        type: 'user',
        identity: { name: 'id', kind: '@id' },
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
        ],
      })
    );

    return schema;
  }

  createCache(capabilities: CacheCapabilitiesManager): Cache {
    return new JSONAPICache(capabilities);
  }

  instantiateRecord(identifier: ResourceKey, createArgs?: Record<string, unknown>): unknown {
    return instantiateRecord(this, identifier, createArgs);
  }

  teardownRecord(record: unknown): void {
    return teardownRecord(record);
  }
}

// our tests use a rendering test context and add manager to it
interface LocalTestContext {
  manager: RequestManager;
}

type UserResource = {
  data: {
    id: string;
    type: 'user';
    attributes: {
      name: string;
    };
  };
};

class SimpleCacheHandler implements CacheHandler {
  _cache: Map<string, unknown> = new Map();
  request<T = unknown>(
    context: RequestContext,
    next: NextFn<T>
  ): T | Promise<T | StructuredDataDocument<T>> | Future<T> {
    const { url, method, cacheOptions } = context.request;
    if (url && method === 'GET' && this._cache.has(url) && cacheOptions?.reload !== true) {
      return this._cache.get(url) as T;
    }

    const future = next(context.request);
    context.setStream(future.getStream());

    return future.then(
      (result) => {
        if (url && method === 'GET') {
          this._cache.set(url, result);
        }
        return result;
      },
      (error) => {
        if (url && method === 'GET') {
          this._cache.set(url, error);
        }
        throw error;
      }
    );
  }
}

async function mockGETSuccess(context: LocalTestContext, attributes?: { name: string }): Promise<string> {
  const url = buildBaseURL({ resourcePath: 'users/1' });
  await GET(context, 'users/1', () => ({
    data: {
      id: '1',
      type: 'user',
      attributes: Object.assign(
        {
          name: 'Chris Thoburn',
        },
        attributes
      ),
    },
  }));
  return url;
}
async function mockGETFailure(context: LocalTestContext): Promise<string> {
  const url = buildBaseURL({ resourcePath: 'users/2' });
  await mock(context, () => ({
    url: 'users/2',
    status: 404,
    headers: {},
    method: 'GET',
    statusText: 'Not Found',
    body: null,
    response: {
      errors: [
        {
          status: '404',
          title: 'Not Found',
          detail: 'The resource does not exist.',
        },
      ],
    },
  }));

  return url;
}
async function mockRetrySuccess(context: LocalTestContext): Promise<string> {
  const url = buildBaseURL({ resourcePath: 'users/2' });
  await GET(context, 'users/2', () => ({
    data: {
      id: '2',
      type: 'user',
      attributes: {
        name: 'Chris Thoburn',
      },
    },
  }));
  return url;
}

export interface RequestSpecSignature extends Record<string, SpecTest<LocalTestContext, object>> {
  'it renders each stage of a request that succeeds': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders only once when the promise already has a result cached': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'it transitions to error state correctly': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'we can retry from error state': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
      retry: (state: { retry: () => Promise<void> }) => void;
    }
  >;
  'externally retriggered request works as expected': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      source: { request: Future<UserResource> };
      countFor: (result: unknown) => number;
      retry: (state: { retry: () => Promise<void> }) => void;
    }
  >;
  'externally retriggered request works as expected (store CacheHandler)': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      source: {
        request: Future<
          SingleResourceDataDocument<{
            id: string;
            name: string;
          }>
        >;
      };
      countFor: (result: unknown) => number;
      retry: (state: { retry: () => Promise<void> }) => void;
    }
  >;
  'it rethrows if error block is not present': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'it transitions to cancelled state correctly': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'we can retry from cancelled state': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
      retry: (state: { retry: () => Promise<void> }) => void;
    }
  >;
  'it transitions to error state if cancelled block is not present': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'it does not rethrow for cancelled': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders only once when the promise error state is already cached': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
      countFor: (result: unknown) => number;
    }
  >;
  'isOnline updates when expected': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
    }
  >;
  '@autorefreshBehavior="reload" works as expected': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      request: Future<UserResource>;
    }
  >;
  'idle state does not error': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
    }
  >;
  'idle state errors if no idle block is present': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
    }
  >;
  'idle state allows for transition to request states': SpecTest<
    LocalTestContext,
    {
      store: Store | RequestManager;
      state: { request: Future<unknown> | undefined };
    }
  >;
  'request with an identity does not trigger a second request': SpecTest<
    LocalTestContext,
    {
      store: Store;
      url: string;
      countFor: (result: unknown) => number;
      dependency: { trackedThing: string };
      setRequest: (
        req: Future<SingleResourceDataDocument<{ id: string; name: string; [Type]: 'user' }>>
      ) => Future<SingleResourceDataDocument<{ id: string; name: string; [Type]: 'user' }>>;
    }
  >;
}

export const RequestSpec: SuiteBuilder<LocalTestContext, RequestSpecSignature> = spec<LocalTestContext>(
  '<Request />',
  function (hooks) {
    hooks.beforeEach(function () {
      const manager = new RequestManager();
      manager.use([new MockServerHandler(this), Fetch]);
      manager.useCache(new SimpleCacheHandler());

      this.manager = manager;
    });
  }
)
  .for('it renders each stage of a request that succeeds')
  .use<{ store: Store | RequestManager; request: Future<UserResource>; countFor: (result: unknown) => number }>(
    async function (assert) {
      const url = await mockGETSuccess(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });
      const state = getRequestState(request);

      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        store: this.manager,
        request,
        countFor,
      });

      assert.equal(state.result, null);
      assert.equal(counter, 1);
      assert.dom().hasText('PendingCount: 1');
      await request;
      await this.h.rerender();
      assert.equal(state, getRequestState(request));
      assert.deepEqual(state.result, {
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris Thoburn',
          },
        },
      });
      assert.equal(counter, 2);
      assert.dom().hasText('Chris ThoburnCount: 2');
    }
  )

  .for('it renders only once when the promise already has a result cached')
  .use<{ store: Store | RequestManager; request: Future<UserResource>; countFor: (result: unknown) => number }>(
    async function (assert) {
      const url = await mockGETSuccess(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });
      const state = getRequestState(request);

      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await request;
      await this.render({
        store: this.manager,
        request,
        countFor,
      });

      assert.deepEqual(state.result, {
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris Thoburn',
          },
        },
      });
      assert.equal(counter, 1);
      assert.dom().hasText('Chris ThoburnCount: 1');

      await this.h.settled();

      assert.deepEqual(state.result, {
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris Thoburn',
          },
        },
      });
      assert.equal(counter, 1);
      assert.dom().hasText('Chris ThoburnCount: 1');
    }
  )

  .for('it transitions to error state correctly')
  .use<{ store: Store | RequestManager; request: Future<UserResource>; countFor: (result: unknown) => number }>(
    async function (assert) {
      const url = await mockGETFailure(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });
      const state = getRequestState(request);

      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        store: this.manager,
        request,
        countFor,
      });

      assert.equal(state, getRequestState(request), 'state is a stable reference');
      assert.equal(state.result, null, 'result is null');
      assert.equal(state.error, null, 'error is null');
      assert.equal(counter, 1, 'counter is 1');
      assert.dom().hasText('PendingCount: 1');
      try {
        await request;
      } catch {
        // ignore the error
      }
      await this.h.rerender();
      assert.equal(state.result, null, 'after rerender result is still null');
      assert.true(state.error instanceof Error, 'error is an instance of Error');
      assert.equal(
        (state.error as Error | undefined)?.message,
        `[404 Not Found] GET (cors) - ${url}`,
        'error message is correct'
      );
      assert.equal(counter, 2, 'counter is 2');
      assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}Count: 2`);
    }
  )

  .for('we can retry from error state')
  .use<{
    store: Store | RequestManager;
    request: Future<UserResource>;
    countFor: (result: unknown) => number;
    retry: (state: { retry: () => Promise<void> }) => void;
  }>(async function (assert) {
    const store = new Store();
    store.requestManager = this.manager;

    const url = await mockGETFailure(this);
    await mockRetrySuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state2 = getRequestState(request);
    let retryPromise: Promise<unknown> | null = null;

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state1: { retry: () => Promise<void> }) {
      assert.step('retry');
      retryPromise = state1.retry();
      return retryPromise;
    }

    await this.render({
      store: store.requestManager,
      request,
      countFor,
      retry,
    });

    assert.equal(state2, getRequestState(request), 'state is a stable reference');
    assert.equal(state2.result, null, 'result is null');
    assert.equal(state2.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText('PendingCount: 1');
    try {
      await request;
    } catch {
      // ignore the error
    }
    await this.h.rerender();
    assert.equal(state2.result, null, 'after rerender result is still null');
    assert.true(state2.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state2.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}Count:2Retry`);

    await this.h.click('[test-id="retry-button"]');

    if (PRODUCTION) {
      // we don't have test waiters in production
      // for all frameworks.
      await retryPromise!;
      await this.h.rerender();
    } else {
      await this.h.settled();
    }

    assert.verifySteps(['retry'], 'we called retry');
    assert.equal(counter, 4, 'counter is 4');
    assert.dom().hasText('Chris ThoburnCount: 4');
  })

  .for('externally retriggered request works as expected')
  .use<{
    store: Store | RequestManager;
    source: { request: Future<UserResource> };
    countFor: (result: unknown) => number;
    retry: (state: { retry: () => Promise<void> }) => void;
  }>(async function (assert) {
    const store = new Store();
    store.requestManager = this.manager;
    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'runspired' });
    const request = store.request<UserResource>({ url, method: 'GET' });
    const state2 = getRequestState(request);

    class RequestSource {
      @signal request: Future<UserResource> = request;
    }
    const source = new RequestSource();

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state1: { retry: () => Promise<void> }) {
      assert.step('retry');
      return state1.retry();
    }

    await this.render({
      store,
      source,
      countFor,
      retry,
    });

    assert.equal(state2, getRequestState(request), 'state is a stable reference');
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText('PendingCount: 1');

    await this.h.pauseTest();

    await request;
    await this.h.rerender();

    assert.equal(counter, 2, 'counter is 2');
    assert.dom().hasText('Chris ThoburnCount: 2');

    await this.h.pauseTest();
    await store.request<UserResource>({ url, method: 'GET', cacheOptions: { reload: true } });
    await this.h.rerender();

    assert.equal(counter, 3, 'counter is 3');
    assert.dom().hasText('runspiredCount: 3');

    await this.h.pauseTest();
  })

  .for('externally retriggered request works as expected (store CacheHandler)')
  .use<{
    store: Store | RequestManager;
    source: {
      request: Future<
        SingleResourceDataDocument<{
          id: string;
          name: string;
        }>
      >;
    };
    countFor: (result: unknown) => number;
    retry: (state: { retry: () => Promise<void> }) => void;
  }>(async function (assert) {
    const store = new Store();
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(StoreHandler);
    store.requestManager = manager;
    this.manager = manager;

    const url = await mockRetrySuccess(this);
    const request = store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' });
    const state2 = getRequestState(request);

    class RequestSource {
      @signal request: Future<SingleResourceDataDocument<User>> = request;
    }
    const source = new RequestSource();

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state1: { retry: () => Promise<void> }) {
      assert.step('retry');
      return state1.retry();
    }

    await this.render({
      store,
      source,
      countFor,
      retry,
    });

    assert.equal(state2, getRequestState(request), 'state is a stable reference');
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText('PendingCount: 1');

    await request;
    await this.h.rerender();
    assert.equal(counter, 2, 'counter is 2');
    assert.dom().hasText('Chris ThoburnCount: 2');

    const request2 = store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' });
    source.request = request2;

    await this.h.rerender();

    assert.equal(counter, 3, 'counter is 3');
    assert.dom().hasText('Chris ThoburnCount: 3');

    await request2;
    await this.h.rerender();

    assert.equal(counter, 3, 'counter is 3');
    assert.dom().hasText('Chris ThoburnCount: 3');
  })

  .for('it rethrows if error block is not present')
  .use<{ store: Store | RequestManager; request: Future<UserResource>; countFor: (result: unknown) => number }>(
    async function (assert) {
      const url = await mockGETFailure(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });
      const state = getRequestState(request);

      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        store: this.manager,
        request,
        countFor,
      });

      assert.equal(state, getRequestState(request), 'state is a stable reference');
      assert.equal(state.result, null, 'result is null');
      assert.equal(state.error, null, 'error is null');
      assert.equal(counter, 1, 'counter is 1');
      assert.dom().hasText('PendingCount: 1');
      const cleanup = setupOnError((error) => {
        assert.step('render-error');
        const message = error instanceof Error ? error.message : error;
        const matches =
          typeof message === 'string' &&
          (PRODUCTION
            ? message.startsWith('[404 Not Found] GET (cors) - ')
            : message.startsWith('\n\nError occurred:\n\n- While rendering:'));
        assert.true(matches, 'error message is correct');
        if (!matches) {
          throw new Error(`Unmatched Error Encountered`, { cause: message });
        }
      });
      try {
        await request;
      } catch {
        // ignore the error
      }
      if (PRODUCTION) {
        // for whatever reason the rethrow isn't immediate in production
        // and is hard to capture
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await this.h.rerender();
      cleanup();

      assert.verifySteps(['render-error']);
      assert.equal(state.result, null, 'after rerender result is still null');
      assert.true(state.error instanceof Error, 'error is an instance of Error');
      assert.equal(
        (state.error as Error | undefined)?.message,
        `[404 Not Found] GET (cors) - ${url}`,
        'error message is correct'
      );
      assert.equal(counter, 1, 'counter is still 1');
      assert.dom().hasText('');
    }
  )

  .for('it transitions to cancelled state correctly')
  .use<{ store: Store | RequestManager; request: Future<UserResource>; countFor: (result: unknown) => number }>(
    async function (assert) {
      const url = await mockGETFailure(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });
      const state = getRequestState(request);

      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        store: this.manager,
        request,
        countFor,
      });

      assert.equal(state, getRequestState(request), 'state is a stable reference');
      assert.equal(state.result, null, 'result is null');
      assert.equal(state.error, null, 'error is null');
      assert.equal(counter, 1, 'counter is 1');
      assert.dom().hasText('PendingCount: 1');

      request.abort();

      try {
        await request;
      } catch {
        // ignore the error
      }
      await this.h.rerender();
      assert.equal(state.result, null, 'after rerender result is still null');
      assert.true(state.error instanceof Error, 'error is an instance of Error');
      assert.equal(
        (state.error as Error | undefined)?.message,
        'The user aborted a request.',
        'error message is correct'
      );
      assert.equal(counter, 2, 'counter is 2');
      assert.dom().hasText('Cancelled The user aborted a request.Count: 2');
    }
  )

  .for('we can retry from cancelled state')
  .use<{
    store: Store | RequestManager;
    request: Future<UserResource>;
    countFor: (result: unknown) => number;
    retry: (state: { retry: () => Promise<void> }) => void;
  }>(async function (assert) {
    const store = new Store();
    store.requestManager = this.manager;

    const url = await mockGETFailure(this);
    await mockRetrySuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state1 = getRequestState(request);

    let retryPromise: Promise<unknown> | null = null;
    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state2: { retry: () => Promise<void> }) {
      assert.step('retry');
      retryPromise = state2.retry();
      return retryPromise;
    }

    await this.render({
      store: this.manager,
      request,
      countFor,
      retry,
    });

    assert.equal(state1, getRequestState(request), 'state is a stable reference');
    assert.equal(state1.result, null, 'result is null');
    assert.equal(state1.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText('PendingCount: 1');

    request.abort();

    try {
      await request;
    } catch {
      // ignore the error
    }
    await this.h.rerender();
    assert.equal(state1.result, null, 'after rerender result is still null');
    assert.true(state1.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state1.error as Error | undefined)?.message,
      'The user aborted a request.',
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.dom().hasText('Cancelled:The user aborted a request.Count:2Retry');

    await this.h.click('[test-id="retry-button"]');

    if (PRODUCTION) {
      await retryPromise!;
      await this.h.rerender();
    }

    assert.verifySteps(['retry']);
    assert.equal(counter, 4, 'counter is 4');
    assert.dom().hasText('Chris ThoburnCount: 4');
  })

  .for('it transitions to error state if cancelled block is not present')
  .use<{ store: Store | RequestManager; request: Future<UserResource>; countFor: (result: unknown) => number }>(
    async function (assert) {
      const url = await mockGETFailure(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });
      const state = getRequestState(request);

      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        store: this.manager,
        request,
        countFor,
      });

      assert.equal(state, getRequestState(request), 'state is a stable reference');
      assert.equal(state.result, null, 'result is null');
      assert.equal(state.error, null, 'error is null');
      assert.equal(counter, 1, 'counter is 1');
      assert.dom().hasText('PendingCount: 1');

      request.abort();

      try {
        await request;
      } catch {
        // ignore the error
      }
      await this.h.rerender();
      assert.equal(state.result, null, 'after rerender result is still null');
      assert.true(state.error instanceof Error, 'error is an instance of Error');
      assert.equal(
        (state.error as Error | undefined)?.message,
        'The user aborted a request.',
        'error message is correct'
      );
      assert.equal(counter, 2, 'counter is 2');
      assert.dom().hasText('The user aborted a request.Count: 2');
    }
  )

  .for('it does not rethrow for cancelled')
  .use<{
    store: Store | RequestManager;
    request: Future<UserResource>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render({
      store: this.manager,
      request,
      countFor,
    });

    assert.equal(state, getRequestState(request), 'state is a stable reference');
    assert.equal(state.result, null, 'result is null');
    assert.equal(state.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText('PendingCount: 1');

    const cleanup = setupOnError((message) => {
      assert.step('render-error');
    });

    request.abort();
    try {
      await request;
    } catch {
      // ignore the error
    }
    await this.h.rerender();
    cleanup();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      'The user aborted a request.',
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText('');
    assert.verifySteps([], 'no error should be thrown');
  })

  .for('it renders only once when the promise error state is already cached')
  .use<{
    store: Store | RequestManager;
    request: Future<UserResource>;
    countFor: (result: unknown) => number;
  }>(async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    try {
      await request;
    } catch {
      // ignore the error
    }
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render({
      store: this.manager,
      request,
      countFor,
    });

    assert.equal(state.result, null, 'after render result is null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}Count: 1`);
    await this.h.rerender();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}Count: 1`);
  })

  .for('isOnline updates when expected')
  .use<{
    store: Store | RequestManager;
    request: Future<UserResource>;
  }>(async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    await this.render({
      store: this.manager,
      request,
    });
    await request;
    await this.h.rerender();

    assert.dom().hasText('Online: true');

    window.dispatchEvent(new Event('offline'));

    await this.h.rerender();

    assert.dom().hasText('Online: false');
    window.dispatchEvent(new Event('online'));

    await this.h.rerender();

    assert.dom().hasText('Online: true');
  })

  .for('@autorefreshBehavior="reload" works as expected')
  .use<{ store: Store | RequestManager; request: Future<UserResource> }>(async function (assert) {
    const store = new Store();
    store.requestManager = this.manager;

    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'James Thoburn' });
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    await this.render({
      store: this.manager,
      request,
    });

    await request;
    await this.h.rerender();

    assert.dom().hasText('Chris Thoburn | Online: true');
    window.dispatchEvent(new Event('offline'));
    await new Promise((resolve) => setTimeout(resolve, 1));

    await this.h.rerender();

    // enable the auto-refresh threshold to trigger
    await new Promise((resolve) => setTimeout(resolve, 1));

    assert.dom().hasText('Chris Thoburn | Online: false');
    window.dispatchEvent(new Event('online'));

    // let the event dispatch complete
    await new Promise((resolve) => setTimeout(resolve, DEBUG ? 1 : 100));

    if (PRODUCTION) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await store._getAllPending();
      await this.h.rerender();
    } else {
      await this.h.settled();
    }
    assert.dom().hasText('James Thoburn | Online: true');
  })

  .for('idle state does not error')
  .use<{ store: Store | RequestManager }>(async function (assert) {
    const cleanup = setupOnError((_message) => {
      assert.step('render-error');
    });
    await this.render({ store: this.manager });

    assert.dom().hasText('Waiting');
    assert.verifySteps([], 'no error should be thrown');
    cleanup();
  })

  .for('idle state errors if no idle block is present')
  .use<{ store: Store | RequestManager }>(async function (assert) {
    const cleanup = setupOnError((error) => {
      assert.step('render-error');

      const message = error instanceof Error ? error.message : error;

      assert.true(
        // prettier-ignore
        typeof message === 'string' &&
        (
          // ember
          message.startsWith('\n\nError occurred:\n\n- While rendering:') ||
          // react
          message.includes('No idle block provided for <Request> component, and no query or request was provided.')
        ),
        `error message is correct: ${message}`
      );
    });
    try {
      await this.render({
        store: this.manager,
      });
    } catch {
      // some frameworks such as React don't throw the error and so its not catchable.
      // TODO consider if this should be something exposed to the spec and used to
      // toggle test behavior.
      // assert.step('render-error-caught');
      // const message = e instanceof Error ? e.message : e;
      // assert.true(
      //   typeof message === 'string' &&
      //     message.includes('No idle block provided for <Request> component, and no query or request was provided'),
      //   `error message is correct: ${String(message)}`
      // );
    }

    assert.dom().hasText('');
    assert.verifySteps(DEBUG ? ['render-error' /* 'render-error-caught' */] : [], 'error should be thrown');
    cleanup();
  })

  .for('idle state allows for transition to request states')
  .use<{
    store: Store | RequestManager;
    state: { request: Future<unknown> | undefined };
  }>(async function (assert) {
    const store = new Store();
    store.requestManager = this.manager;

    const url = await mockGETSuccess(this);

    class State {
      @signal request: ReturnType<typeof store.request> | undefined = undefined;
    }
    const state = new State();

    await this.render({
      store,
      state,
    });

    assert.dom().hasText('Waiting');

    const request = store.request<UserResource>({ url, method: 'GET' });
    state.request = request;

    await request;
    await this.h.rerender();

    assert.dom().hasText('Content');
  })

  .for('request with an identity does not trigger a second request')
  .use<{
    store: Store;
    url: string;
    countFor: (result: unknown) => number;
    dependency: { trackedThing: string };
    setRequest: (
      req: Future<SingleResourceDataDocument<{ id: string; name: string; [Type]: 'user' }>>
    ) => Future<SingleResourceDataDocument<{ id: string; name: string; [Type]: 'user' }>>;
  }>(async function (assert) {
    const store = new Store();
    store.lifetimes = {
      isHardExpired: () => true,
      isSoftExpired: () => true,
    };
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(StoreHandler);
    store.requestManager = manager;
    this.manager = manager;

    const url = await mockGETSuccess(this);
    await mockGETSuccess(this); // need this because we are planning on making two requests

    class Dependency {
      @signal trackedThing = 'value';
    }
    const dependency = new Dependency();

    type Req = Future<SingleResourceDataDocument<User>>;
    let request: Req;
    function setRequest(req: Req): Req {
      request = req;
      return request;
    }

    function countFor(thing: unknown): number {
      assert.step((thing as string | undefined) ?? 'unknown step; this should never happen');
      return 0;
    }

    await this.render({
      countFor,
      dependency,
      url,
      setRequest,
      store,
    });

    const state = getRequestState(request!);
    assert.equal(state.result, null);
    assert.verifySteps(['loading'], 'loading');
    await request!;
    await this.h.rerender();
    assert.equal(state, getRequestState(request!));
    const record = store.peekRecord<User>('user', '1');
    assert.notEqual(record, null);
    assert.equal(state.result?.data, record);
    assert.equal(record!.name, 'Chris Thoburn');
    assert.verifySteps(['Chris Thoburn']);

    dependency.trackedThing = 'new-value'; // trigger a notification

    await this.h.rerender();
    assert.notEqual(state, getRequestState(request!));
    assert.equal(state.result?.data, record);
    assert.equal(record!.name, 'Chris Thoburn');
    assert.verifySteps(['loading']);
  })
  .build();
