import { mock, MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { module, test } from 'qunit';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

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

module('RequestManager | Fetch Handler', function (hooks) {
  test('Parses 200 Responses', async function (assert) {
    const manager = new RequestManager();
    manager.use([MockServerHandler, Fetch]);

    await GET('users/1', () => ({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    }));

    const doc = await manager.request({ url: 'https://localhost:1135/users/1' });
    const serialized = JSON.parse(JSON.stringify(doc)) as unknown;
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    serialized.response.headers = (serialized.response.headers as [string, string][]).filter((v) => {
      // don't test headers that change every time
      return !['content-length', 'date', 'etag', 'last-modified'].includes(v[0]);
    });

    assert.deepEqual(
      serialized,
      {
        content: {
          data: {
            attributes: {
              name: 'Chris Thoburn',
            },
            id: '1',
            type: 'user',
          },
        },
        request: {
          url: 'https://localhost:1135/users/1',
        },
        response: {
          headers: [
            ['cache-control', 'no-store'],
            ['content-type', 'application/vnd.api+json'],
          ],
          ok: true,
          redirected: false,
          status: 200,
          statusText: '',
          type: 'default',
          url: '',
        },
      },
      'The response is processed correctly'
    );
  });

  test('It provides useful errors', async function (assert) {
    const manager = new RequestManager();
    manager.use([MockServerHandler, Fetch]);

    await mock(() => ({
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
    }));

    try {
      await manager.request({ url: 'https://localhost:1135/users/1' });
      assert.ok(false, 'Should have thrown');
    } catch (e) {
      isNetworkError(e);
      assert.true(e instanceof AggregateError, 'The error is an AggregateError');
      assert.strictEqual(e.message, '[404] - https://localhost:1135/users/1', 'The error message is correct');
      assert.strictEqual(e.status, 404, 'The error status is correct');
      assert.strictEqual(e.statusText, 'Not Found', 'The error statusText is correct');
      assert.strictEqual(e.code, 404, 'The error code is correct');
      assert.strictEqual(e.name, 'NotFoundError', 'The error code is correct');
      assert.true(e.isRequestError, 'The error is a request error');

      // error.content is present
      assert.deepEqual(
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

  test('It provides useful error during abort', async function (assert) {
    const manager = new RequestManager();
    manager.use([MockServerHandler, Fetch]);

    await GET('users/1', () => ({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Chris Thoburn',
        },
      },
    }));

    try {
      const future = manager.request({ url: 'https://localhost:1135/users/1' });
      await Promise.resolve();
      future.abort();
      await future;
      assert.ok(false, 'Should have thrown');
    } catch (e) {
      isNetworkError(e);
      assert.true(e instanceof DOMException, 'The error is a DOMException');
      assert.strictEqual(e.message, 'The user aborted a request.', 'The error message is correct');
      assert.strictEqual(e.status, 20, 'The error status is correct');
      assert.strictEqual(e.statusText, 'Aborted', 'The error statusText is correct');
      assert.strictEqual(e.code, 20, 'The error code is correct');
      assert.strictEqual(e.name, 'AbortError', 'The error name is correct');
      assert.true(e.isRequestError, 'The error is a request error');
    }
  });
});
