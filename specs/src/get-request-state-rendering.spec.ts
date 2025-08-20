import { Fetch, RequestManager } from '@warp-drive/core';
import type { CacheHandler, Future, NextFn } from '@warp-drive/core/request';
import { getRequestState } from '@warp-drive/core/store/-private';
import type { RequestContext, StructuredDataDocument } from '@warp-drive/core/types/request';
import { spec, type SpecTest, type SuiteBuilder } from '@warp-drive/diagnostic/spec';
import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { buildBaseURL } from '@warp-drive/utilities';

// our tests use a rendering test context and add manager to it
interface LocalTestContext {
  manager: RequestManager;
}

type RequestState<RT, E> = ReturnType<typeof getRequestState<RT, E>>;
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
  const url = buildBaseURL({ resourcePath: 'users/1' });
  await GET(context, 'users/1', () => ({
    data: {
      id: '1',
      type: 'user',
      attributes: {
        name: 'Chris Thoburn',
      },
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

export interface GetRequestStateRenderingSpecSignature extends Record<string, SpecTest<LocalTestContext, object>> {
  'it renders each stage of a request resolving in a new microtask queue': SpecTest<
    LocalTestContext,
    {
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown) => number;
    }
  >;
  'it renders only once when the promise already has a result cached': SpecTest<
    LocalTestContext,
    {
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown) => number;
    }
  >;
  'it transitions to error state correctly': SpecTest<
    LocalTestContext,
    {
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown, error: unknown) => number;
    }
  >;
  'it renders only once when the promise error state is already cached': SpecTest<
    LocalTestContext,
    {
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown, error: unknown) => number;
    }
  >;
}

export const GetRequestStateRenderingSpec: SuiteBuilder<LocalTestContext, GetRequestStateRenderingSpecSignature> =
  spec<LocalTestContext>('get-request-state rendering', function (hooks) {
    hooks.beforeEach(function () {
      const manager = new RequestManager();
      manager.use([new MockServerHandler(this), Fetch]);
      manager.useCache(new SimpleCacheHandler());

      this.manager = manager;
    });
  })
    .for('it renders each stage of a request resolving in a new microtask queue')
    .use<{
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown) => number;
    }>(async function (assert) {
      const url = await mockGETSuccess(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });

      let state1: RequestState<UserResource, unknown> | undefined;
      function _getRequestState(p: Future<UserResource>): RequestState<UserResource, unknown> {
        state1 = getRequestState(p);
        return state1;
      }
      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        request,
        _getRequestState,
        countFor,
      });

      assert.equal(state1!.result, null);
      assert.equal(counter, 1);
      assert.dom().hasText('Count:\n          1');

      await request;
      await this.h.rerender();

      assert.equal(state1, getRequestState(request));
      assert.deepEqual(state1!.result, {
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris Thoburn',
          },
        },
      });
      assert.equal(counter, 2);
      assert.dom().hasText('Chris ThoburnCount:\n          2');
    })

    .for('it renders only once when the promise already has a result cached')
    .use<{
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown) => number;
    }>(async function (assert) {
      const url = await mockGETSuccess(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });

      await request;

      let state1: RequestState<UserResource, unknown> | undefined;
      function _getRequestState(p: Future<UserResource>): RequestState<UserResource, unknown> {
        state1 = getRequestState(p);
        return state1;
      }
      let counter = 0;
      function countFor(_result: unknown) {
        return ++counter;
      }

      await this.render({
        request,
        _getRequestState,
        countFor,
      });

      assert.dom().hasText('Chris ThoburnCount:\n          1');
      await this.h.rerender();

      assert.dom().hasText('Chris ThoburnCount:\n          1');
    })

    .for('it transitions to error state correctly')
    .use<{
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown, error: unknown) => number;
    }>(async function (assert) {
      const url = await mockGETFailure(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });

      let state1: RequestState<UserResource, unknown> | undefined;
      function _getRequestState(p: Future<UserResource>): RequestState<UserResource, unknown> {
        state1 = getRequestState(p);
        return state1;
      }
      let counter = 0;
      function countFor(_result: unknown, _error: unknown) {
        return ++counter;
      }

      await this.render({
        request,
        _getRequestState,
        countFor,
      });

      assert.equal(state1!, getRequestState(request), 'state is a stable reference');
      assert.equal(state1!.result, null, 'result is null');
      assert.equal(state1!.error, null, 'error is null');
      assert.equal(counter, 1, 'counter is 1');
      assert.dom().hasText('Pending\n          Count:\n          1');
      try {
        await request;
      } catch {
        // ignore the error
      }
      await this.h.rerender();
      assert.equal(state1!.result, null, 'after rerender result is still null');
      assert.true(state1!.error instanceof Error, 'error is an instance of Error');
      const errorMessage = (state1!.error as Error | undefined)?.message;
      assert.equal(errorMessage, `[404 Not Found] GET (cors) - ${url}`, 'error message is correct');
      assert.equal(counter, 2, 'counter is 2');
      assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}\n          Count:\n          2`);
    })

    .for('it renders only once when the promise error state is already cached')
    .use<{
      request: Future<UserResource>;
      _getRequestState: (p: Future<UserResource>) => RequestState<UserResource, unknown>;
      countFor: (result: unknown, error: unknown) => number;
    }>(async function (assert) {
      const url = await mockGETFailure(this);
      const request = this.manager.request<UserResource>({ url, method: 'GET' });

      try {
        await request;
      } catch {
        // ignore the error
      }

      let state1: RequestState<UserResource, unknown> | undefined;
      function _getRequestState(p: Future<UserResource>): RequestState<UserResource, unknown> {
        state1 = getRequestState(p);
        return state1;
      }
      let counter = 0;
      function countFor(_result: unknown, _error: unknown) {
        return ++counter;
      }

      await this.render({
        request,
        _getRequestState,
        countFor,
      });

      assert.equal(state1!.result, null);
      assert.true(state1!.error instanceof Error);
      const errorMessage = (state1!.error as Error | undefined)?.message;
      assert.equal(errorMessage, `[404 Not Found] GET (cors) - ${url}`, 'error message is correct');
      assert.equal(counter, 1);
      assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}\n          Count:\n          1`);
      await this.h.rerender();
      assert.equal(state1!.result, null);
      assert.true(state1!.error instanceof Error);
      assert.equal(counter, 1);
      assert.dom().hasText(`[404 Not Found] GET (cors) - ${url}\n          Count:\n          1`);
    })
    .build();
