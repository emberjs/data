import Cache from '@ember-data/json-api';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import Store, { CacheHandler } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { module, test } from '@warp-drive/diagnostic';
import { mock, MockServerHandler } from '@warp-drive/holodeck';

const RECORD = false;

function isNetworkError(e: unknown): asserts e is Error & {
  status: number;
  statusText: string;
  code: number;
  name: string;
  isRequestError: boolean;
  content?: object;
  errors?: object[];
} {
  if (!(e instanceof Error)) {
    throw new Error('Expected a network error');
  }
}

class TestStore extends Store {
  override createCache(wrapper: CacheCapabilitiesManager) {
    return new Cache(wrapper);
  }
}

module('Integration | @ember-data/json-api Cach.put(<ErrorDocument>)', function (hooks) {
  test('Useful errors are propagated by the CacheHandler', async function (assert) {
    const manager = new RequestManager();
    const store = new TestStore();

    manager.use([new MockServerHandler(this), Fetch]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    await mock(
      this,
      () => ({
        url: 'users/1',
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

    try {
      await store.request({ url: 'https://localhost:1135/users/1' });
      assert.ok(false, 'Should have thrown');
    } catch (e) {
      isNetworkError(e);
      assert.true(e instanceof AggregateError, 'The error is an AggregateError');
      assert.equal(
        e.message,
        '[404 Not Found] GET (cors) - https://localhost:1135/users/1',
        'The error message is correct'
      );
      assert.equal(e.status, 404, 'The error status is correct');
      assert.equal(e.statusText, 'Not Found', 'The error statusText is correct');
      assert.equal(e.code, 404, 'The error code is correct');
      assert.equal(e.name, 'NotFoundError', 'The error code is correct');
      assert.true(e.isRequestError, 'The error is a request error');

      // error.content is present
      assert.satisfies(
        // @ts-expect-error content property is loosely typed
        e.content,
        {
          errors: [
            {
              status: '404',
              title: 'Not Found',
              detail: 'The resource does not exist.',
            },
          ],
        },
        'The error.content is present'
      );

      // error.errors is present
      assert.deepEqual(
        e.errors,
        [
          {
            status: '404',
            title: 'Not Found',
            detail: 'The resource does not exist.',
          },
        ],
        'The error.errors is present'
      );
    }
  });
});
