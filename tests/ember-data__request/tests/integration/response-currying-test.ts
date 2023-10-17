import { module, test } from '@warp-drive/diagnostic';

import RequestManager from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Handler, NextFn } from '@ember-data/request/-private/types';

const IGNORED_HEADERS = new Set(['connection', 'keep-alive', 'content-length', 'date', 'etag', 'last-modified']);

module('RequestManager | Response Currying', function () {
  test('We curry response when setResponse is not called', async function (assert) {
    const manager = new RequestManager();
    const handler1: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await next(context.request);
        return response.content;
      },
    };
    const handler2: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler1, handler2]);

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

  test('We do not curry response when we call next multiple times', async function (assert) {
    const manager = new RequestManager();
    const handler1: Handler = {
      async request<T>(context: Context, next: NextFn<T>): Promise<T> {
        await next(context.request);
        await next(context.request);
        return (await next(context.request)).content;
      },
    };
    const handler2: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler1, handler2]);

    const doc = await manager.request({ url: '../assets/demo-fetch.json' });

    assert.equal(doc.response, null, 'The response is processed correctly');
  });

  test('We curry when we return directly', async function (assert) {
    const manager = new RequestManager();
    const handler1: Handler = {
      async request<T>(context: Context, next: NextFn<T>): Promise<T> {
        return next(context.request) as unknown as Promise<T>;
      },
    };
    const handler2: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler1, handler2]);

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

  test('We can intercept Response', async function (assert) {
    const manager = new RequestManager();
    const handler1: Handler = {
      async request<T>(context: Context, next: NextFn<T>): Promise<T> {
        const doc = await next(context.request);

        const response = Object.assign({}, doc.response, { ok: false });
        context.setResponse(response);

        return doc.content;
      },
    };
    const handler2: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler1, handler2]);

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
        ok: false,
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

  test("We can can't mutate Response", async function (assert) {
    assert.expect(3);
    const manager = new RequestManager();
    const handler1: Handler = {
      async request<T>(context: Context, next: NextFn<T>): Promise<T> {
        const doc = await next(context.request);

        try {
          // @ts-expect-error
          doc.response!.ok = false;
          assert.ok(false, 'we should be immutable');
        } catch (e) {
          assert.ok(true, 'we are immutable');
        }

        try {
          doc.response!.headers.append('foo', 'bar');
          assert.ok(false, 'we should be immutable');
        } catch (e) {
          assert.ok(true, 'we are immutable');
        }

        return doc.content;
      },
    };
    const handler2: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler1, handler2]);

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

  test('We can set response to null', async function (assert) {
    const manager = new RequestManager();
    const handler1: Handler = {
      async request<T>(context: Context, next: NextFn<T>): Promise<T> {
        const doc = await next(context.request);

        context.setResponse(null);

        return doc.content;
      },
    };
    const handler2: Handler = {
      async request<T>(context: Context, next: NextFn<T>) {
        const response = await fetch(context.request.url!, context.request);
        context.setResponse(response);
        return response.json();
      },
    };
    manager.use([handler1, handler2]);

    const doc = await manager.request({ url: '../assets/demo-fetch.json' });

    assert.equal(doc.response, null, 'The response is processed correctly');
  });
});
