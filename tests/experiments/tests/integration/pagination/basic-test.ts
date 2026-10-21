import { Fetch, RequestManager } from '@warp-drive/core';
import type { CollectionResourceDataDocument } from '@warp-drive/core/types/spec/document';
import { module, test } from '@warp-drive/diagnostic';
import { clearPaginationCache, getPaginationState } from '@warp-drive/experiments/pagination';
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

module('Integration | Pagination | cyclic links', function (hooks) {
  hooks.beforeEach(function () {
    clearPaginationCache();
  });

  test('loadNext does not revisit the current page through a self-referential next link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);

    const url = buildBaseURL({ resourcePath: 'users/1' });

    await GET(this, 'users/1', () => ({
      data: [
        {
          id: '1',
          type: 'user',
          attributes: { name: 'Chris Thoburn' },
        },
      ],
      links: {
        self: url,
        next: url,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;

    const result = await paginationState.loadNext();

    assert.equal(result, null, 'the current page is not loaded again as its own successor');
    assert.false(paginationState.hasNext, 'a self-referential next link does not leave a forward frontier');
    assert.false(
      paginationState.hasPrevious,
      'a self-referential next link does not infer the current page as its own predecessor'
    );
    assert.equal(Array.from(paginationState.pages).length, 1, 'the frontier still contains exactly one page');
  });

  test('loadPrev does not revisit the current page through a self-referential prev link', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);

    const url = buildBaseURL({ resourcePath: 'users/1' });

    await GET(this, 'users/1', () => ({
      data: [
        {
          id: '1',
          type: 'user',
          attributes: { name: 'Chris Thoburn' },
        },
      ],
      links: {
        prev: url,
        self: url,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;

    const result = await paginationState.loadPrev();

    assert.equal(result, null, 'the current page is not loaded again as its own predecessor');
    assert.false(paginationState.hasPrevious, 'a self-referential prev link does not leave a backward frontier');
    assert.false(
      paginationState.hasNext,
      'a self-referential prev link does not infer the current page as its own successor'
    );
    assert.equal(Array.from(paginationState.pages).length, 1, 'the frontier still contains exactly one page');
  });

  test('loadNext stops when the extended frontier links to itself', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });

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
        next: url2,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url1, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;
    await paginationState.loadNext();

    assert.equal(Array.from(paginationState.pages).length, 2, 'the frontier extends to the second page');

    const result = await paginationState.loadNext();

    assert.equal(result, null, 'the second page is not revisited as its own successor');
    assert.false(paginationState.hasNext, 'the forward frontier closes on a self-referential next link');
    assert.equal(Array.from(paginationState.pages).length, 2, 'the frontier still contains two pages');
  });

  test('loadPrev stops when the extended frontier links to itself', async function (assert) {
    const manager = new RequestManager();
    manager.use([new MockServerHandler(this), Fetch]);

    const url1 = buildBaseURL({ resourcePath: 'users/1' });
    const url2 = buildBaseURL({ resourcePath: 'users/2' });

    await GET(this, 'users/2', () => ({
      data: [{ id: '2', type: 'user', attributes: { name: 'Leo Euclides' } }],
      links: {
        prev: url1,
        self: url2,
      },
    }));

    await GET(this, 'users/1', () => ({
      data: [{ id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } }],
      links: {
        prev: url1,
        self: url1,
        next: url2,
      },
    }));

    const request = manager.request<CollectionResourceDataDocument<UserResource>>({ url: url2, method: 'GET' });
    const paginationState = getPaginationState(request);

    await request;
    await paginationState.loadPrev();

    assert.equal(Array.from(paginationState.pages).length, 2, 'the frontier extends to the first page');

    const result = await paginationState.loadPrev();

    assert.equal(result, null, 'the first page is not revisited as its own predecessor');
    assert.false(paginationState.hasPrevious, 'the backward frontier closes on a self-referential prev link');
    assert.equal(Array.from(paginationState.pages).length, 2, 'the frontier still contains two pages');
  });
});
