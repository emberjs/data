import { MockServerHandler } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';
import { module, test } from 'qunit';

import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

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
});
