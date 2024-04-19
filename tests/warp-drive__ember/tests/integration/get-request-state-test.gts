import { rerender, settled } from '@ember/test-helpers';

import type { CacheHandler, Future, NextFn, RequestContext, StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { getRequestState } from '@warp-drive/ember';
import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';

type RequestState<T, RT> = ReturnType<typeof getRequestState<RT, T>>;
type UserResource = {
  data: {
    id: string;
    type: 'user';
    attributes: {
      name: string;
    };
  };
};

// our tests use a rendering test context and add manager to it
interface LocalTestContext extends RenderingTestContext {
  manager: RequestManager;
}
type DiagnosticTest = Parameters<typeof _test<LocalTestContext>>[1];
function test(name: string, callback: DiagnosticTest): void {
  return _test<LocalTestContext>(name, callback);
}

const RECORD = false;

class SimpleCacheHandler implements CacheHandler {
  _cache: Map<string, unknown> = new Map();
  request<T = unknown>(
    context: RequestContext,
    next: NextFn<T>
  ): T | Promise<T | StructuredDataDocument<T>> | Future<T> {
    const { url, method } = context.request;
    if (url && method === 'GET' && this._cache.has(url)) {
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

async function mockGETSuccess(context: LocalTestContext): Promise<string> {
  await GET(
    context,
    'users/1',
    () => ({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    }),
    { RECORD: RECORD }
  );
  return 'https://localhost:1135/users/1';
}
async function mockGETFailure(context: LocalTestContext): Promise<string> {
  await mock(
    context,
    () => ({
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
    }),
    RECORD
  );

  return 'https://localhost:1135/users/2';
}

module<LocalTestContext>('Integration | get-request-state', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    this.manager = manager;
  });

  test('It returns a request state that updates on success', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request({ url, method: 'GET' });
    const requestState = getRequestState(request);

    assert.true(requestState.isLoading, 'The request state is loading');
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isError, 'The request state is not an error');
    assert.equal(requestState.result, null, 'The result is null');
    assert.equal(requestState.error, null, 'The error is null');
    await request;
    assert.true(requestState.isSuccess, 'The request state is successful');
    assert.false(requestState.isLoading, 'The request state is no longer loading');
    assert.false(requestState.isError, 'The request state is not an error');
    assert.deepEqual(requestState.result, {
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    });
    assert.equal(requestState.error, null, 'The error is null');
  });

  test('It returns a request state that updates on failure', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request({ url, method: 'GET' });
    const requestState = getRequestState(request);

    assert.true(requestState.isLoading, 'The request state is loading');
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isError, 'The request state is not an error');
    assert.equal(requestState.result, null, 'The result is null');
    assert.equal(requestState.error, null, 'The error is null');
    try {
      await request;
    } catch {
      // ignore the error
    }
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isLoading, 'The request state is no longer loading');
    assert.true(requestState.isError, 'The request state is an error');
    assert.equal(requestState.result, null);
    assert.satisfies(
      // @ts-expect-error
      requestState.error,
      {
        code: 404,
        status: 404,
        name: 'NotFoundError',
        isRequestError: true,
        error: '[404 Not Found] GET (cors) - https://localhost:1135/users/2?__xTestId=b830e11d&__xTestRequestNumber=0',
        statusText: 'Not Found',
        message: '[404 Not Found] GET (cors) - https://localhost:1135/users/2',
        errors: [{ status: '404', title: 'Not Found', detail: 'The resource does not exist.' }],
        content: {
          errors: [{ status: '404', title: 'Not Found', detail: 'The resource does not exist.' }],
        },
        response: {
          ok: false,
          status: 404,
          redirected: false,
        },
      },
      'The error is meaningful'
    );
  });

  test('It returns a request state that updates on abort', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request({ url, method: 'GET' });
    const requestState = getRequestState(request);

    assert.true(requestState.isLoading, 'The request state is loading');
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isError, 'The request state is not an error');
    assert.equal(requestState.result, null, 'The result is null');
    assert.equal(requestState.error, null, 'The error is null');

    request.abort();

    try {
      await request;
    } catch {
      // ignore the error
    }
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isLoading, 'The request state is no longer loading');
    assert.true(requestState.isCancelled, 'The request state is cancelled');
    assert.true(requestState.isError, 'The request state is an error');
    assert.equal(requestState.result, null);
    assert.satisfies(
      // @ts-expect-error
      requestState.error,
      {
        code: 20,
        status: 20,
        name: 'AbortError',
        isRequestError: true,
        error: 'The user aborted a request.',
        statusText: 'Aborted',
        message: 'The user aborted a request.',
        response: null,
      },
      'The error is meaningful'
    );
  });

  test('Loading State is Lazy', async function (assert) {
    const url = await mockGETSuccess(this);
    let requestComplete = false;
    const request = this.manager.request({ url, method: 'GET' });
    const requestState = getRequestState(request);
    void request.finally(() => (requestComplete = true));

    assert.true(requestState.isLoading, 'The request state is loading');
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isError, 'The request state is not an error');
    assert.equal(requestState.result, null, 'The result is null');
    assert.equal(requestState.error, null, 'The error is null');
    assert.false(requestComplete, 'The request is not yet complete');

    const loadingState = requestState.loadingState;
    assert.false(loadingState._triggered, 'The loadingstate has not triggered (and thus is lazy)');
    assert.true(loadingState.isPending, 'loading has not yet started');
    assert.true(loadingState._triggered, 'The loadingstate was triggered by accessing isPending (and thus is lazy)');
    assert.false(loadingState.isStarted, 'loading has not yet started');
    assert.false(loadingState.isComplete, 'loading has not yet finished');
    assert.false(loadingState.isCancelled, 'loading has not been aborted');
    assert.false(loadingState.isErrored, 'loading has not errored');

    const streamPromise = request.getStream();
    // this should resolve prior to the request
    await streamPromise;

    assert.false(loadingState.isPending, 'loading is no longer pending');
    assert.true(loadingState.isStarted, 'loading has now started');
    assert.false(loadingState.isComplete, 'loading has not yet finished');
    assert.false(loadingState.isCancelled, 'loading has not been aborted');
    assert.false(loadingState.isErrored, 'loading has not errored');
    assert.true(loadingState.stream instanceof ReadableStream, 'stream is available');
    assert.false(requestComplete, 'The request is not yet complete');

    await loadingState.promise!;

    assert.false(loadingState.isPending, 'loading is no longer pending');
    assert.false(loadingState.isStarted, 'loading is no longer started');
    assert.true(loadingState.isComplete, 'loading has now finished');
    assert.false(loadingState.isCancelled, 'loading has not been aborted');
    assert.false(loadingState.isErrored, 'loading has not errored');
    assert.equal(loadingState.stream, null, 'stream is no longer available');
    assert.false(requestComplete, 'The request is not yet complete');

    await request;

    assert.true(requestComplete, 'The request is now complete!');
  });

  test('it renders each stage of a request resolving in a new microtask queue', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    let state: RequestState<UserResource, UserResource>;
    function _getRequestState<RT, T>(p: Future<RT>): RequestState<T, RT> {
      state = getRequestState(p) as RequestState<UserResource, UserResource>;
      return state as RequestState<T, RT>;
    }
    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getRequestState request) as |state|}}
          {{state.result.data.attributes.name}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>
    );

    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Count:\n          1');
    await request;
    await rerender();
    assert.equal(state!, getRequestState(request));
    assert.deepEqual(state!.result, {
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    });
    assert.equal(counter, 2);
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount:\n          2');
  });

  test('it renders only once when the promise already has a result cached', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request<UserResource>({ url, method: 'GET' });

    let state: RequestState<UserResource, UserResource>;
    function _getRequestState<RT, T>(p: Future<RT>): RequestState<T, RT> {
      state = getRequestState(p) as RequestState<UserResource, UserResource>;
      return state as RequestState<T, RT>;
    }
    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    await request;
    await this.render(
      <template>
        {{#let (_getRequestState request) as |state|}}
          {{state.result.data.attributes.name}}<br />Count:
          {{countFor state.result}}
        {{/let}}
      </template>
    );

    assert.deepEqual(state!.result, {
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    });
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount:\n          1');

    await settled();

    assert.deepEqual(state!.result, {
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    });
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount:\n          1');
  });

  test('it transitions to error state correctly', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request({ url, method: 'GET' });

    let state: RequestState<UserResource, UserResource>;
    function _getRequestState<RT, T>(p: Future<RT>): RequestState<T, RT> {
      state = getRequestState(p) as RequestState<UserResource, UserResource>;
      return state as RequestState<T, RT>;
    }
    let counter = 0;
    function countFor(_result: unknown, _error: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getRequestState request) as |state|}}
          {{#if state.isLoading}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}
        {{/let}}
      </template>
    );

    assert.equal(state!, getRequestState(request), 'state is a stable reference');
    assert.equal(state!.result, null, 'result is null');
    assert.equal(state!.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'Pending\n          Count:\n          1');
    try {
      await request;
    } catch {
      // ignore the error
    }
    await rerender();
    assert.equal(state!.result, null, 'after rerender result is still null');
    assert.true(state!.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state!.error as Error | undefined)?.message,
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2',
      'error message is correct'
    );
    assert.equal(counter, 2, 'counter is 2');
    assert.equal(
      this.element.textContent?.trim(),
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2\n          Count:\n          2'
    );
  });

  test('it renders only once when the promise error state is already cached', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request({ url, method: 'GET' });

    try {
      await request;
    } catch (e) {
      // ignore the error
    }
    let state: RequestState<UserResource, UserResource>;
    function _getRequestState<RT, T>(p: Future<RT>): RequestState<T, RT> {
      state = getRequestState(p) as RequestState<UserResource, UserResource>;
      return state as RequestState<T, RT>;
    }
    let counter = 0;
    function countFor(_result: unknown, _error: unknown) {
      return ++counter;
    }

    await this.render(
      <template>
        {{#let (_getRequestState request) as |state|}}
          {{#if state.isLoading}}
            Pending
          {{else if state.isError}}
            {{state.error.message}}
          {{else if state.isSuccess}}
            Invalid Success Reached
          {{/if}}
          <br />Count:
          {{countFor state.result state.error}}
        {{/let}}
      </template>
    );

    assert.equal(state!.result, null, 'after render result is null');
    assert.true(state!.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state!.error as Error | undefined)?.message,
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2',
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(
      this.element.textContent?.trim(),
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2\n          Count:\n          1'
    );
    await rerender();
    assert.equal(state!.result, null, 'after rerender result is still null');
    assert.true(state!.error instanceof Error, 'error is an instance of Error');
    assert.equal(
      (state!.error as Error | undefined)?.message,
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2',
      'error message is correct'
    );
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(
      this.element.textContent?.trim(),
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2\n          Count:\n          1'
    );
  });
});
