import { module, test } from 'qunit';

import { RequestManager } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Future, Handler, NextFn } from '@ember-data/request/-private/types';

module('RequestManager | Streams', function () {
  test('We can read the stream returned from a handler', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.true(stream instanceof ReadableStream, 'we receive the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });

  test('We can proxy the stream from a parent handler', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);

        context.setStream(future.getStream());

        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.true(stream instanceof ReadableStream, 'we receive the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });

  test('We can interrupt the stream from a parent handler', async function (assert) {
    assert.expect(3);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);
        const stream = await future.getStream();
        assert.true(stream instanceof ReadableStream, 'we receive the stream');
        // we don't set stream

        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.strictEqual(stream, null, 'we receive the null as the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });

  test('We can curry the stream from a parent handler by not accessing it', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);
        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.true(stream instanceof ReadableStream, 'we receive the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });

  test('We curry the stream when returning the future directly', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler1: Handler = {
      request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        return next(context.request);
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.true(stream instanceof ReadableStream, 'we receive the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });

  test('We do not curry the stream when calling next more than once', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const a = await next(context.request);
        const b = await next(context.request);
        return a.data || b.data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.strictEqual(stream, null, 'we do not receive the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });

  test('We curry the stream when calling next more than once if a future is returned', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        await next(context.request);
        await next(context.request);
        return next(context.request);
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const result = await fetch(context.request.url!, context.request);

        if (result.body) {
          context.setStream(result.clone().body!);
        }

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });
    const stream = await future.getStream();

    assert.true(stream instanceof ReadableStream, 'we receive the stream');
    const result = await future;
    assert.deepEqual(
      result.data,
      {
        data: {
          type: 'example',
          id: '1',
        },
      },
      'Final response is correct'
    );
  });
});
