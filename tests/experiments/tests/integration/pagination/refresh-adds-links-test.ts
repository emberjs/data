import { Fetch, RequestManager } from '@warp-drive/core';
import type { CacheHandler, Future, NextFn } from '@warp-drive/core/request';
import type { RequestContext, StructuredDataDocument } from '@warp-drive/core/types/request';
import type { CollectionResourceDataDocument } from '@warp-drive/core/types/spec/document';
import type { PaginationLinks } from '@warp-drive/core/types/spec/json-api-raw';
import { module, test } from '@warp-drive/diagnostic';
import {
  clearPaginationCache,
  getPaginationCache,
  getPaginationLinks,
  getPaginationState,
} from '@warp-drive/experiments/pagination';
import { MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { buildBaseURL } from '@warp-drive/utilities';

type UserResource = {
  id: string;
  type: 'user';
  attributes: {
    name: string;
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

module('Integration | Pagination | refreshed links', function (hooks) {
  hooks.beforeEach(function () {
    clearPaginationCache();
  });

  test('re-adopting a refreshed page adds a newly available next link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: null,
      },
    }));

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: url2,
      },
    }));

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        prev: url1,
        self: url2,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url1, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;
    // Allow the pagination state to install the initial pagination links.
    await Promise.resolve();

    assert.false(paginationState.hasNext, 'the initial response has no forward frontier');

    const reloadRequest = manager.request<CollectionResourceDataDocument<UserResource>>({
      url: url1,
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const reloaded = await reloadRequest;

    assert.equal(
      (reloaded.content.links as PaginationLinks).next,
      url2,
      'the reloaded response exposes the new next link'
    );

    await paginationState.adoptPage(reloadRequest);

    assert.true(paginationState.hasNext, 'the refreshed page exposes the newly available next page');

    if (!paginationState.hasNext) {
      return;
    }

    const result = await paginationState.loadNext();

    assert.true(result !== null, 'loadNext loads the newly discovered next page');

    if (result === null) {
      return;
    }

    const nextPageId = result.data[0]?.id;
    assert.equal(nextPageId, '2', 'the newly discovered page is page 2');

    if (nextPageId !== '2') {
      return;
    }

    assert.false(paginationState.hasNext, 'the forward frontier closes after loading the new final page');
    assert.equal(Array.from(paginationState.pages).length, 2, 'the pagination run contains both loaded pages');
  });

  test('re-adopting a refreshed page replaces an existing next link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });
    const url3 = buildBaseURL({ resourcePath: 'users/3' });

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: url2,
      },
    }));

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: url3,
      },
    }));

    await GET(this, 'users/3', () => ({
      data: [{ id: '3', type: 'user', attributes: { name: 'Godfrey Chan' } }],
      links: {
        self: url3,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url1, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;
    // Allow the pagination state to install the initial pagination links.
    await Promise.resolve();

    assert.true(paginationState.hasNext, 'the initial response exposes the original next page');

    const reloadRequest = manager.request<CollectionResourceDataDocument<UserResource>>({
      url: url1,
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const reloaded = await reloadRequest;

    assert.equal(
      (reloaded.content.links as PaginationLinks).next,
      url3,
      'the reloaded response replaces the next link with page 3'
    );

    await paginationState.adoptPage(reloadRequest);

    const result = await paginationState.loadNext();

    assert.equal(result?.data[0]?.id, '3', 'loadNext follows the refreshed next link instead of the stale one');
  });

  test('re-adopting a refreshed page removes a next link when it is omitted', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: url2,
      },
    }));

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url1, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;
    // Allow the pagination state to install the initial pagination links.
    await Promise.resolve();

    assert.true(paginationState.hasNext, 'the initial response exposes the next page');

    const reloadRequest = manager.request<CollectionResourceDataDocument<UserResource>>({
      url: url1,
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const reloaded = await reloadRequest;
    const reloadedLinks = reloaded.content.links as PaginationLinks;

    assert.false('next' in reloadedLinks, 'the reloaded response omits the next link');

    await paginationState.adoptPage(reloadRequest);

    assert.false(paginationState.hasNext, 'the refreshed page removes the stale forward frontier');
  });

  test('re-adopting a refreshed page removes stale adjacency when replacing next link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });
    const url3 = buildBaseURL({ resourcePath: 'users/3' });

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: url2,
      },
    }));

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        self: url1,
        next: url3,
      },
    }));

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        self: url2,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url1, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;
    // Allow the pagination state to install the initial pagination links.
    await Promise.resolve();

    assert.true(paginationState.hasNext, 'the initial response exposes the original next page');

    const initialNext = await paginationState.loadNext();
    assert.equal(initialNext?.data[0]?.id, '2', 'the original next link loads page 2');

    if (initialNext?.data[0]?.id !== '2') {
      return;
    }

    const paginationCache = getPaginationCache<CollectionResourceDataDocument<UserResource>, unknown>(url1);
    assert.deepEqual(
      Array.from(paginationCache.pages, (page) => page.selfLink),
      [url1, url2],
      'the loaded graph contains the original page 1 to page 2 adjacency'
    );

    const reloadRequest = manager.request<CollectionResourceDataDocument<UserResource>>({
      url: url1,
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const reloaded = await reloadRequest;

    assert.equal(
      (reloaded.content.links as PaginationLinks).next,
      url3,
      'the reloaded response replaces the next link with page 3'
    );

    await paginationState.adoptPage(reloadRequest);

    assert.deepEqual(
      Array.from(paginationCache.pages, (page) => page.selfLink),
      [url1, url3],
      'the refreshed graph replaces the old adjacency instead of retaining page 2'
    );
  });

  test('re-adopting a refreshed page removes a stale first link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        first: url1,
        self: url2,
      },
    }));

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        first: null,
        self: url2,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url2, method: 'GET' });
    const paginationState = getPaginationState(request);
    const paginationLinks = getPaginationLinks(paginationState);

    await request;
    // Allow the pagination state to install the initial pagination links.
    await Promise.resolve();

    assert.equal(paginationLinks.first?.url, url1, 'the initial response exposes the first link');

    const reloadRequest = manager.request<CollectionResourceDataDocument<UserResource>>({
      url: url2,
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const reloaded = await reloadRequest;

    assert.equal(
      (reloaded.content.links as PaginationLinks).first,
      null,
      'the reloaded response removes the first link'
    );

    await paginationState.adoptPage(reloadRequest);

    assert.equal(paginationLinks.first, null, 'the refreshed pagination links remove the stale first link');
  });

  test('re-adopting a refreshed page removes a stale last link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(new SimpleCacheHandler());

    const url2 = buildBaseURL({ resourcePath: 'users/2' });
    const url3 = buildBaseURL({ resourcePath: 'users/3' });

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        self: url2,
        last: url3,
      },
    }));

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        self: url2,
        last: null,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url2, method: 'GET' });
    const paginationState = getPaginationState(request);
    const paginationLinks = getPaginationLinks(paginationState);

    await request;
    // Allow the pagination state to install the initial pagination links.
    await Promise.resolve();

    assert.equal(paginationLinks.last?.url, url3, 'the initial response exposes the last link');

    const reloadRequest = manager.request<CollectionResourceDataDocument<UserResource>>({
      url: url2,
      method: 'GET',
      cacheOptions: { reload: true },
    });
    const reloaded = await reloadRequest;

    assert.equal((reloaded.content.links as PaginationLinks).last, null, 'the reloaded response removes the last link');

    await paginationState.adoptPage(reloadRequest);

    assert.equal(paginationLinks.last, null, 'the refreshed pagination links remove the stale last link');
  });
});
