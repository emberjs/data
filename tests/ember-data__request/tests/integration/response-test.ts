import { module, test } from '@warp-drive/diagnostic';

import RequestManager from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Handler, NextFn } from '@ember-data/request/-private/types';

const IGNORED_HEADERS = new Set(['connection', 'keep-alive', 'content-length', 'date', 'etag', 'last-modified']);

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
      return !IGNORED_HEADERS.has(v[0]);
    });
    // @ts-expect-error port is unstable in CI
    delete serialized.url;

    assert.deepEqual(
      serialized,
      {
        ok: true,
        redirected: false,
        headers: [
          ['content-type', 'application/json;charset=utf-8'],
          // ['date', 'Wed, 23 Nov 2022 05:17:11 GMT'],
          // ['etag', 'W/"39-1849db13af9"'],
          // ['last-modified', 'Tue, 22 Nov 2022 04:55:48 GMT'],
        ],
        status: 200,
        statusText: 'OK',
        type: 'basic',
      },
      'The response is processed correctly'
    );
  });
});
