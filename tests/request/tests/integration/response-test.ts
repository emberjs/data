import { module, test } from 'qunit';

import RequestManager from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Handler, NextFn } from '@ember-data/request/-private/types';

module('RequestManager | Response', function () {
  test('Handlers may set response via Response', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler]);

    const doc = await manager.request({ url: '../assets/demo-fetch.json' });
    const serialized = JSON.parse(JSON.stringify(doc.response)) as unknown;
    // @ts-expect-error
    serialized.headers = (serialized.headers as [string, string][]).filter((v) => {
      // don't test headers that change every time
      return !['date', 'etag', 'last-modified'].includes(v[0]);
    });

    assert.deepEqual(
      serialized,
      {
        ok: true,
        redirected: false,
        headers: [
          ['accept-ranges', 'bytes'],
          ['cache-control', 'public, max-age=0'],
          ['content-length', '57'],
          ['content-type', 'application/json; charset=UTF-8'],
          // ['date', 'Wed, 23 Nov 2022 05:17:11 GMT'],
          // ['etag', 'W/"39-1849db13af9"'],
          // ['last-modified', 'Tue, 22 Nov 2022 04:55:48 GMT'],
          ['vary', 'Accept-Encoding'],
          ['x-powered-by', 'Express'],
        ],
        status: 200,
        statusText: 'OK',
        type: 'basic',
        url: 'http://localhost:7357/1502/assets/demo-fetch.json',
      },
      'The response is processed correctly'
    );
  });
});