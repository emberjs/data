import { fn } from '@ember/helper';
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

const urls = [
  buildBaseURL({ resourcePath: 'users/1' }),
  buildBaseURL({ resourcePath: 'users/2' }),
  buildBaseURL({ resourcePath: 'users/3' }),
  buildBaseURL({ resourcePath: 'users/4' }),
  buildBaseURL({ resourcePath: 'users/5' }),
  buildBaseURL({ resourcePath: 'users/6' }),
];

const users = [
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
  {
    id: '4',
    type: 'user',
    attributes: {
      name: 'Benedikt Deicke',
    },
  },
  {
    id: '5',
    type: 'user',
    attributes: {
      name: 'Jane Portman',
    },
  },
  {
    id: '6',
    type: 'user',
    attributes: {
      name: 'Mia Sinek',
    },
  },
];

const responses = [
  {
    data: [users[0]],
    links: {
      prev: null,
      self: urls[0],
      next: urls[1],
    },
  },
  {
    data: [users[1]],
    links: {
      prev: urls[0],
      self: urls[1],
      next: urls[2],
    },
  },
  {
    data: [users[2]],
    links: {
      prev: urls[1],
      self: urls[2],
      next: urls[3],
    },
  },
  {
    data: [users[3]],
    links: {
      prev: urls[2],
      self: urls[3],
      next: urls[4],
    },
  },
  {
    data: [users[4]],
    links: {
      prev: urls[3],
      self: urls[4],
      next: urls[5],
    },
  },
  {
    data: [users[5]],
    links: {
      prev: urls[4],
      self: urls[5],
      next: null,
    },
  },
];

module<LocalTestContext>('Integration | <Paginate />', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    this.manager = manager;
  });

  test('it renders each stage of a infinite collection pagination', async function (assert) {
    await GET(this, 'users/2', () => responses[1]);
    await GET(this, 'users/1', () => responses[0]);
    await GET(this, 'users/3', () => responses[2]);

    const request = this.manager.request<UserResource>({ url: urls[1], method: 'GET' });
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
    assert.equal(state.initialPage.state, getRequestState(request));

    await request;
    await rerender();
    assert.equal(state.pages.length, 3, '3 pages');
    assert.equal(state.data.length, 1, '1 loaded record');
    assert.deepEqual(state.data, [users[1]]);
    assert.equal(counter, 2);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Leo EuclidesCount: 2');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-prev]');
    assert.equal(state.pages.length, 3, '3 pages');
    assert.equal(state.data.length, 2, '2 loaded records');
    assert.deepEqual(state.data, [users[0], users[1]]);
    assert.equal(counter, 4);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Chris ThoburnCount: 4');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 2, '2 users rendered');

    await click('[data-test-load-next]');
    assert.equal(state.pages.length, 4, '4 pages');
    assert.equal(state.data.length, 3, '3 loaded records');
    assert.deepEqual(state.data, [users[0], users[1], users[2]]);
    assert.equal(counter, 6);
    assert.equal(
      this.element.querySelector('[data-test-user-name]:nth-of-type(3)').textContent.trim(),
      'Mehul ChaudhariCount: 6'
    );
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 3, '3 users rendered');
  });

  test('it renders the currently selected page', async function (assert) {
    await GET(this, 'users/2', () => responses[1]);
    await GET(this, 'users/1', () => responses[0]);
    await GET(this, 'users/6', () => responses[5]);
    await GET(this, 'users/5', () => responses[4]);
    await GET(this, 'users/4', () => responses[3]);
    await GET(this, 'users/3', () => responses[2]);

    const request = this.manager.request<UserResource>({ url: urls[1], method: 'GET' });
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
            <Request @request={{pagination.activePageRequest}}>
              <:idle><span data-test-idle>No page is active</span></:idle>
              <:content as |content|>
                {{#each content.data as |user|}}
                  <span data-test-user-name>{{user.attributes.name}}<br />Count: {{countFor user}}</span>
                {{/each}}
              </:content>
              <:loading><span data-test-loading-page>Pending<br />Count: {{countFor request}}</span></:loading>
            </Request>

            {{#each urls as |url index|}}
              <button {{on "click" (fn pagination.loadPage url)}} data-test-load-page={{index}}>{{index}}</button>
            {{/each}}
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
    assert.equal(state.initialPage.state, getRequestState(request), 'Initial page state matches request state');

    await request;
    await rerender();
    assert.equal(state.pages.length, 3, '3 pages');
    assert.deepEqual(state.activePage.value.data, [users[1]]);
    assert.equal(counter, 2);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Leo EuclidesCount: 2');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-page="0"]');
    assert.equal(state.pages.length, 3, '3 pages');
    assert.equal(state.data.length, 2, '2 loaded records');
    assert.deepEqual(state.activePage.value.data, [users[0]]);
    assert.equal(counter, 4);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Chris ThoburnCount: 4');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-page="5"]');
    assert.equal(state.pages.length, 2, '2 pages');
    assert.deepEqual(state.activePage.value.data, [users[5]]);
    assert.equal(counter, 6);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Mia SinekCount: 6');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-page="4"]');
    assert.equal(state.pages.length, 3, '3 pages');
    assert.deepEqual(state.activePage.value.data, [users[4]]);
    assert.equal(counter, 8);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Jane PortmanCount: 8');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-page="3"]');
    assert.equal(state.pages.length, 6, '6 pages');
    assert.deepEqual(state.activePage.value.data, [users[3]]);
    assert.equal(counter, 10);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Benedikt DeickeCount: 10');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');

    await click('[data-test-load-page="2"]');
    assert.equal(state.pages.length, 6, '6 pages');
    assert.deepEqual(state.activePage.value.data, [users[2]]);
    assert.equal(counter, 12);
    assert.equal(this.element.querySelector('[data-test-user-name]').textContent.trim(), 'Mehul ChaudhariCount: 12');
    assert.equal(this.element.querySelectorAll('[data-test-user-name]').length, 1, '1 user rendered');
  });
});
