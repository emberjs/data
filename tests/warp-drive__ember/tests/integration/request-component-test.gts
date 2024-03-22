import { rerender, settled } from '@ember/test-helpers';

import type { CacheHandler, Future, NextFn, RequestContext, StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { getRequestState, Request } from '@warp-drive/ember';
import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';

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
    const request = this.manager.request({ url, method: 'GET' });
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

    assert.equal(state!.result, null);
    assert.equal(counter, 1);
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');
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
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 2');
  });

  test('it renders only once when the promise already has a result cached', async function (assert) {
    const url = await mockGETSuccess(this);
    const request = this.manager.request({ url, method: 'GET' });
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
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
          <:content as |result|>{{result.data.attributes.name}}<br />Count: {{countFor result}}</:content>
        </Request>
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
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 1');

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
    assert.equal(this.element.textContent?.trim(), 'Chris ThoburnCount: 1');
  });

  test('it transitions to error state correctly', async function (assert) {
    const url = await mockGETFailure(this);
    const request = this.manager.request({ url, method: 'GET' });
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

    assert.equal(state!, getRequestState(request), 'state is a stable reference');
    assert.equal(state!.result, null, 'result is null');
    assert.equal(state!.error, null, 'error is null');
    assert.equal(counter, 1, 'counter is 1');
    assert.equal(this.element.textContent?.trim(), 'PendingCount: 1');
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
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2Count: 2'
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
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2Count: 1'
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
      '[404 Not Found] GET (cors) - https://localhost:1135/users/2Count: 1'
    );
  });
});
