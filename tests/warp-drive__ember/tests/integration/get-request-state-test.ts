import { rerender, settled } from '@ember/test-helpers';

import { hbs } from 'ember-cli-htmlbars';

import type { CacheHandler, Future, NextFn, RequestContext, StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { getRequestState } from '@warp-drive/ember';
import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';

type RequestState = ReturnType<typeof getRequestState>;

// our tests use a rendering test context and add manager to it
interface LocalTestContext extends RenderingTestContext {
  manager: RequestManager;
}
type DiagnosticTest = Parameters<typeof _test<LocalTestContext>>[1];
function test(name: string, callback: DiagnosticTest): void {
  return _test<LocalTestContext>(name, callback);
}

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

    return next(context.request).then(
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
    'https://localhost:1135/users/1',
    () => ({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    }),
    { RECORD: true }
  );
  return 'https://localhost:1135/users/1';
}
async function mockGETFailure(context: LocalTestContext): Promise<string> {
  await mock(context, () => ({
    url: 'https://localhost:1135/users/2',
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

  test('It returns a request state', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request({ url, method: 'GET' });
    const requestState = getRequestState(request);

    assert.true(requestState.isLoading, 'The request state is loading');
    assert.false(requestState.isSuccess, 'The request state is not successful');
    assert.false(requestState.isError, 'The request state is not an error');
    await request;
    assert.true(requestState.isSuccess, 'The request state is successful');
    assert.false(requestState.isLoading, 'The request state is no longer loading');
    assert.false(requestState.isError, 'The request state is not an error');
  });
});
