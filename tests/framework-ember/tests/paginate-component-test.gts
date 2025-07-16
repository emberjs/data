import { on } from '@ember/modifier';
import { click, rerender } from '@ember/test-helpers';

import { Fetch, RequestManager } from '@warp-drive/core';
import type { CacheHandler, Future, NextFn } from '@warp-drive/core/request';
import type { RequestContext, StructuredDataDocument } from '@warp-drive/core/types/request';
import type { RenderingTestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test as _test } from '@warp-drive/diagnostic/ember';
import { getPaginationState, getRequestState, Paginate, Request } from '@warp-drive/ember';
import { MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { buildBaseURL } from '@warp-drive/utilities';

// our tests use a rendering test context and add manager to it
interface LocalTestContext extends RenderingTestContext {
  manager: RequestManager;
}
type DiagnosticTest = Parameters<typeof _test<LocalTestContext>>[1];
function test(name: string, callback: DiagnosticTest): void {
  return _test<LocalTestContext>(name, callback);
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
  const url2 = buildBaseURL({ resourcePath: 'users/2' });
  const url3 = buildBaseURL({ resourcePath: 'users/3' });

  await GET(context, 'users/2', () => ({
    data: [
      {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Leo Euclides',
        },
      },
    ],
    links: {
      prev: url,
      self: url2,
      next: url3,
    },
  }));

  await GET(context, 'users/1', () => ({
    data: [
      {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    ],
    links: {
      prev: null,
      self: url,
      next: url2,
    },
  }));

  await GET(context, 'users/3', () => ({
    data: [
      {
        id: '3',
        type: 'user',
        attributes: {
          name: 'Mehul Chaudhari',
        },
      },
    ],
    links: {
      prev: url2,
      self: url3,
      next: null,
    },
  }));

  return url2;
}

module<LocalTestContext>('Integration | <Paginate />', function (hooks) {
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
    const state = getPaginationState(request);

    let counter = 0;
    function countFor(_result: unknown) {
      return ++counter;
    }

    const manager = this.manager;

    await this.render(
      <template>
        <Paginate @request={{request}} @store={{manager}}>
          <:loading>
            <span data-test-pending>Pending<br />Count: {{countFor request}}</span>
          </:loading>
          <:content as |pagination|>
            {{#if pagination.hasPrev}}
              <Request @request={{pagination.prevRequest}}>
                <:idle><button {{on "click" pagination.loadPrev}} data-test-load-prev>Load Previous</button></:idle>
                <:loading><span data-test-loading-prev>Pending<br />Count: {{countFor request}}</span></:loading>
              </Request>
            {{/if}}

            {{#each pagination.data as |user|}}
              <span data-test-user-name>{{user.attributes.name}}<br />Count: {{countFor user}}</span>
            {{/each}}

            {{#if pagination.hasNext}}
              <Request @request={{pagination.nextRequest}}>
                <:idle><button {{on "click" pagination.loadNext}} data-test-load-next>Load Next</button></:idle>
                <:loading><span data-test-loading-next>Pending<br />Count: {{countFor request}}</span></:loading>
              </Request>
            {{/if}}
          </:content>
          <:error as |error|>{{error.message}}<br />Count: {{countFor error}}</:error>
        </Paginate>
      </template>
    );

    assert.equal(counter, 1);
    assert.equal(this.element.querySelector('[data-test-pending]').textContent?.trim(), 'PendingCount: 1');
    assert.true(state.isLoading, 'Initially in loading state');
    assert.false(state.isSuccess, 'Initially not in success state');
    assert.false(state.isError, 'Initially not in error state');
    assert.equal(state.pages.length, 1, '1 page initially');
    assert.equal(state.data.length, 0, 'No data initially');
    assert.equal(state.initialState, getRequestState(request));

    await request;
    await rerender();
    assert.equal(state.pages.length, 1, '1 page');
    assert.equal(state.data.length, 1, '1 loaded record');
    assert.deepEqual(state.data, [
      {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Leo Euclides',
        },
      },
    ]);
    assert.equal(counter, 2);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Leo EuclidesCount: 2');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-prev]');
    assert.equal(state.pages.length, 2, '2 pages');
    assert.equal(state.data.length, 2, '2 loaded records');
    assert.deepEqual(state.data, [
      {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
      {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Leo Euclides',
        },
      },
    ]);
    assert.equal(counter, 3);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Chris ThoburnCount: 3');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 2, '2 users rendered');

    await click('[data-test-load-next]');
    assert.equal(state.pages.length, 3, '3 pages');
    assert.equal(state.data.length, 3, '3 loaded records');
    assert.deepEqual(state.data, [
      {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
      {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Leo Euclides',
        },
      },
      {
        id: '3',
        type: 'user',
        attributes: {
          name: 'Mehul Chaudhari',
        },
      },
    ]);
    assert.equal(counter, 4);
    assert.equal(
      this.element.querySelector('[data-test-user-name]:nth-of-type(3)').textContent.trim(),
      'Mehul ChaudhariCount: 4'
    );
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 3, '3 users rendered');
  });
});
