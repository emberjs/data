/* eslint-disable no-console */
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { click, rerender, settled } from '@ember/test-helpers';
import { cached, tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';

import type { CacheHandler, Future, NextFn, RequestContext, StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { buildBaseURL } from '@ember-data/request-utils';
import type Store from '@ember-data/store';
import { CacheHandler as StoreHandler } from '@ember-data/store';
import type { SingleResourceDataDocument } from '@warp-drive/core-types/spec/document';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { getRequestState, Request } from '@warp-drive/ember';
import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record/schema';
import type { Type } from '@warp-drive/core-types/symbols';

// our tests use a rendering test context and add manager to it
interface LocalTestContext extends RenderingTestContext {
  manager: RequestManager;
}
type DiagnosticTest = Parameters<typeof _test<LocalTestContext>>[1];
function test(name: string, callback: DiagnosticTest): void {
  return _test<LocalTestContext>(name, callback);
}

function setupOnError(cb: (message: Error | string) => void) {
  const originalLog = console.error;
  // eslint-disable-next-line prefer-const
  let cleanup!: () => void;
  const handler = function (e: ErrorEvent | (Event & { reason: Error | string })) {
    if (e instanceof ErrorEvent || e instanceof Event) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      cb('error' in e ? (e.error as string | Error) : e.reason);
    } else {
      cb(e);
    }
    cleanup();
    return false;
  };
  cleanup = () => {
    window.removeEventListener('unhandledrejection', handler, { capture: true });
    window.removeEventListener('error', handler, { capture: true });
    console.error = originalLog;
  };
  console.error = handler;

  window.addEventListener('unhandledrejection', handler, { capture: true });
  window.addEventListener('error', handler, { capture: true });

  return cleanup;
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

module<LocalTestContext>('Integration | <Request />', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    this.manager = manager;
  });

  test('it renders each stage of a request that succeeds', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');
    await request;
    await rerender();
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
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 2');
  });

  test('it renders only once when the promise already has a result cached', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await request;
    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:cancelled as |error|>Cancelled {{error.message}}<br />Count: {{countFor error}}</:cancelled>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

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
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 1');

    await settled();

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
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 1');
  });

  test('it transitions to error state correctly', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state, getRequestState(request), 'state is a stable reference');
    assert.equal(state.result, null, 'result is null');
    assert.equal(state.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');
    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), `[404 Not Found] GET (cors) - ${url}Count: 2`);
  });

  test('we can retry from error state', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    store.requestManager = this.manager;

    const url = await mockGETFailure(this);
    await mockRetrySuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state2 = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state1: { retry: () => void }) {
      assert.step('retry');
      return state1.retry();
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state2, getRequestState(request), 'state is a stable reference');
    assert.equal(state2.result, null, 'result is null');
    assert.equal(state2.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');
    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    assert.equal(state2.result, null, 'after rerender result is still null');
    assert.true(state2.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state2.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), `[404 Not Found] GET (cors) - ${url}Count:2Retry`);

    await click('[test-id="retry-button"]');

    assert.verifySteps(['retry']);
    assert.equal(counter, 4, 'counter is 4');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 4');
  });

  test('externally retriggered request works as expected', async function (assert) {
    const url = await mockRetrySuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state2 = getRequestState(request);

    class RequestSource {
      @tracked request: Future<UserResource> = request;
    }
    const source = new RequestSource();

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state1: { retry: () => void }) {
      assert.step('retry');
      return state1.retry();
    }

    await this.render(
      <template>
        <Request @request={{source.request}}>
          <:loading as |state|>Pending<br />Count: {{countFor state}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state2, getRequestState(request), 'state is a stable reference');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');

    await request;
    await rerender();

    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 2');

    const request2 = this.manager.request<UserResource>({ url, method: 'GET' });
    source.request = request2;

    await rerender();

    assert.equal(counter, 3, 'counter is 3');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 3');
  });

  test('externally retriggered request works as expected (store CacheHandler)', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(StoreHandler);
    store.requestManager = manager;
    this.manager = manager;

    registerDerivations(store.schema);
    store.schema.registerResource(
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
    type User = {
      id: string;
      name: string;
    };

    const url = await mockRetrySuccess(this);
    const request = store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' });
    const state2 = getRequestState(request);

    class RequestSource {
      @tracked request: Future<SingleResourceDataDocument<User>> = request;
    }
    const source = new RequestSource();

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state1: { retry: () => void }) {
      assert.step('retry');
      return state1.retry();
    }

    await this.render(
      <template>
        <Request @request={{source.request}}>
          <:loading as |state|>Pending<br />Count: {{countFor state}}</:loading>
          <:error as |error state|>{{error.message}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:error>
          <:content as |result|>{{result.data.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state2, getRequestState(request), 'state is a stable reference');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');

    await request;
    await rerender();
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 2');

    const request2 = store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' });
    source.request = request2;

    await rerender();

    assert.equal(counter, 3, 'counter is 3');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 3');

    await request2;
    await rerender();

    assert.equal(counter, 3, 'counter is 3');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 3');
  });

  test('it rethrows if error block is not present', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state, getRequestState(request), 'state is a stable reference');
    assert.equal(state.result, null, 'result is null');
    assert.equal(state.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');
    const cleanup = setupOnError((message) => {
      assert.step('render-error');
      assert.true(
        typeof message === 'string' && message.startsWith('\n\nError occurred:\n\n- While rendering:'),
        'error message is correct'
      );
    });
    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
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
    assert.equal(this.element.textContent?.trim(), '');
  });

  test('it transitions to cancelled state correctly', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:cancelled as |error|>Cancelled {{error.message}}<br />Count: {{countFor error}}</:cancelled>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state, getRequestState(request), 'state is a stable reference');
    assert.equal(state.result, null, 'result is null');
    assert.equal(state.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');

    request.abort();

    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      'The user aborted a request.',
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), 'Cancelled The user aborted a request.Count: 2');
  });

  test('we can retry from cancelled state', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    store.requestManager = this.manager;

    const url = await mockGETFailure(this);
    await mockRetrySuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state1 = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }
    function retry(state2: { retry: () => void }) {
      assert.step('retry');
      return state2.retry();
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:cancelled as |error state|>Cancelled:
            {{~error.message~}}<br />Count:
            {{~countFor error~}}
            <button {{on "click" (fn retry state)}} test-id="retry-button">Retry</button>
          </:cancelled>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state1, getRequestState(request), 'state is a stable reference');
    assert.equal(state1.result, null, 'result is null');
    assert.equal(state1.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');

    request.abort();

    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    assert.equal(state1.result, null, 'after rerender result is still null');
    assert.true(state1.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state1.error as Error | undefined)?.message,
      'The user aborted a request.',
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), 'Cancelled:The user aborted a request.Count:2Retry');

    await click('[test-id="retry-button"]');

    assert.verifySteps(['retry']);
    assert.equal(counter, 4, 'counter is 4');
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 4');
  });

  test('it transitions to error state if cancelled block is not present', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state, getRequestState(request), 'state is a stable reference');
    assert.equal(state.result, null, 'result is null');
    assert.equal(state.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');

    request.abort();

    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      'The user aborted a request.',
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(this.element.textContent?.trim(), 'The user aborted a request.Count: 2');
  });

  test('it does not rethrow for cancelled', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });
    const state = getRequestState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state, getRequestState(request), 'state is a stable reference');
    assert.equal(state.result, null, 'result is null');
    assert.equal(state.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');

    const cleanup = setupOnError((message) => {
      assert.step('render-error');
    });

    request.abort();
    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    cleanup();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      'The user aborted a request.',
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), '');
    assert.verifySteps([], 'no error should be thrown');
  });

  test('it renders only once when the promise error state is already cached', async function (assert) {
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

    await this.render(
      <template>
        <Request @request={{request}}>
          <:loading>Pending<br />Count: {{countFor request}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
      </template>
    );

    assert.equal(state.result, null, 'after render result is null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), `[404 Not Found] GET (cors) - ${url}Count: 1`);
    await rerender();
    assert.equal(state.result, null, 'after rerender result is still null');
    assert.true(state.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state.error as Error | undefined)?.message,
      `[404 Not Found] GET (cors) - ${url}`,
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), `[404 Not Found] GET (cors) - ${url}Count: 1`);
  });

  test('isOnline updates when expected', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    await this.render(
      <template>
        <Request @request={{request}}>
          <:content as |result state|>Online: {{state.isOnline}}</:content>
        </Request>
      </template>
    );
    await request;
    await rerender();

    assert.equal(this.element.textContent?.trim(), 'Online: true');
    window.dispatchEvent(new Event('offline'));

    await rerender();

    assert.equal(this.element.textContent?.trim(), 'Online: false');
    window.dispatchEvent(new Event('online'));

    await rerender();

    assert.equal(this.element.textContent?.trim(), 'Online: true');
  });

  test('@autorefreshBehavior="reload" works as expected', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    store.requestManager = this.manager;

    const url = await mockGETSuccess(this);
    await mockGETSuccess(this, { name: 'James Thoburn' });
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    await this.render(
      <template>
        <Request
          @request={{request}}
          @autorefresh={{true}}
          @autorefreshBehavior={{"reload"}}
          @autorefreshThreshold={{0}}
        >
          <:content as |result state|>{{result.data.attributes.name}} | Online: {{state.isOnline}}</:content>
        </Request>
      </template>
    );
    await request;
    await rerender();

    assert.equal(this.element.textContent?.trim(), 'Chris Thoburn | Online: true');
    window.dispatchEvent(new Event('offline'));

    await rerender();

    // enable the auto-refresh threshold to trigger
    await new Promise((resolve) => setTimeout(resolve, 1));

    assert.equal(this.element.textContent?.trim(), 'Chris Thoburn | Online: false');
    window.dispatchEvent(new Event('online'));

    // let the event dispatch complete
    await new Promise((resolve) => setTimeout(resolve, 1));
    await settled();
    assert.equal(this.element.textContent?.trim(), 'James Thoburn | Online: true');
  });

  test('idle state does not error', async function (assert) {
    const cleanup = setupOnError((_message) => {
      assert.step('render-error');
    });
    await this.render(
      <template>
        <Request>
          <:idle>Waiting</:idle>
          <:content>Content</:content>
          <:error>Error</:error>
        </Request>
      </template>
    );

    assert.equal(this.element.textContent?.trim(), 'Waiting');
    assert.verifySteps([], 'no error should be thrown');
    cleanup();
  });

  test('idle state errors if no idle block is present', async function (assert) {
    const cleanup = setupOnError((message) => {
      assert.step('render-error');

      assert.true(
        typeof message === 'string' && message.startsWith('\n\nError occurred:\n\n- While rendering:'),
        'error message is correct'
      );
    });
    try {
      await this.render(
        <template>
          <Request>
            <:content>Content</:content>
            <:error>Error</:error>
          </Request>
        </template>
      );
    } catch (e) {
      assert.step('render-error-caught');
      const message = e instanceof Error ? e.message : e;
      assert.true(
        typeof message === 'string' &&
          message.includes('No idle block provided for <Request> component, and no query or request was provided'),
        `error message is correct: ${String(message)}`
      );
    }

    assert.equal(this.element.textContent?.trim(), '');
    assert.verifySteps(['render-error', 'render-error-caught'], 'error should be thrown');
    cleanup();
  });

  test('idle state allows for transition to request states', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    store.requestManager = this.manager;

    const url = await mockGETSuccess(this);

    class State {
      @tracked request: ReturnType<typeof store.request> | undefined = undefined;
    }
    const state = new State();
    await this.render(
      <template>
        <Request @request={{state.request}}>
          <:idle>Waiting</:idle>
          <:content>Content</:content>
          <:error>Error</:error>
        </Request>
      </template>
    );

    assert.equal(this.element.textContent?.trim(), 'Waiting');

    const request = store.request<UserResource>({ url, method: 'GET' });
    state.request = request;

    await request;
    await rerender();

    assert.equal(this.element.textContent?.trim(), 'Content');
  });

  test('request with an identity does not trigger a second request', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    store.lifetimes = {
      isHardExpired: () => true,
      isSoftExpired: () => true,
    };
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(StoreHandler);
    store.requestManager = manager;
    this.manager = manager;

    registerDerivations(store.schema);
    store.schema.registerResource(
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
    type User = {
      id: string;
      name: string;
      [Type]: 'user';
    };

    const url = await mockGETSuccess(this);
    await mockGETSuccess(this); // need this because we are planning on making two requests

    class Dependency {
      @tracked trackedThing = 'value';
    }
    const dependency = new Dependency();

    let request: ReturnType<typeof store.request<SingleResourceDataDocument<User>>> | undefined;
    class Issuer extends Component {
      // Ensure that the request doesn't kick off until after the Request component renders.
      @cached
      get request() {
        dependency.trackedThing; // subscribe to something tracked
        request = store.request<SingleResourceDataDocument<User>>({ url, method: 'GET' });
        return request;
      }

      <template>
        <Request @request={{this.request}}>
          <:loading>Pending<br />Count: {{countFor "loading"}}</:loading>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error.message}}</:error>
          <:content as |result|>{{result.data.name}}<br />{{countFor result.data.name}}</:content>
        </Request>
      </template>
    }

    function countFor(thing: string) {
      assert.step(thing);
    }

    await this.render(<template><Issuer /></template>);

    const state = getRequestState(request);
    assert.equal(state.result, null);
    assert.verifySteps(['loading'], 'loading');
    await request;
    await rerender();
    assert.equal(state, getRequestState(request));
    const record = store.peekRecord<User>('user', '1');
    assert.notEqual(record, null);
    assert.equal(state.result.data, record);
    assert.equal(record!.name, 'Chris Thoburn');
    assert.verifySteps(['Chris Thoburn']);

    dependency.trackedThing = 'value'; // trigger a notification

    await rerender();
    assert.notEqual(state, getRequestState(request));
    assert.equal(state.result.data, record);
    assert.equal(record!.name, 'Chris Thoburn');
    assert.verifySteps(['loading']);
  });
});
