import { module, test } from 'qunit';

import { RequestManager } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Future, Handler, NextFn, RequestInfo } from '@ember-data/request/-private/types';

module('RequestManager | Abort', function () {
  test('We can abort requests', async function (assert) {
    assert.expect(2);
    const manager = new RequestManager();
    const handler: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal');
        const result = await fetch(context.request.url!, context.request);

        return result.json() as T;
      },
    };
    manager.use([handler]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });

    try {
      future.abort();
      await future;
      assert.ok(false, 'aborting a request should result in the promise rejecting');
    } catch (e) {
      assert.true(e instanceof Error);
    }
  });

  test('We can abort requests called via next', async function (assert) {
    assert.expect(3);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler1');

        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler2');
        const result = await fetch(context.request.url!, context.request);

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });

    try {
      future.abort();
      await future;
      assert.ok(false, 'aborting a request should result in the promise rejecting');
    } catch (e) {
      assert.true(e instanceof Error);
    }
  });

  test("We can abort tee'd requests called via next", async function (assert) {
    assert.expect(5);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);
        const future2 = next(context.request);
        const future3 = next(context.request);
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler1');
        await Promise.all([future, future2, future3]);

        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler2');
        const result = await fetch(context.request.url!, context.request);

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });

    try {
      future.abort();
      await future;
      assert.ok(false, 'aborting a request should result in the promise rejecting');
    } catch (e) {
      assert.true(e instanceof Error);
    }
  });

  test('We fully abort even when a handler does not pass along our signal', async function (assert) {
    assert.expect(3);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler1');

        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler2');
        const request: RequestInfo = Object.assign({}, context.request) as RequestInfo;
        delete request.signal;
        const result = await fetch(request.url!, request);

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json' });

    try {
      future.abort();
      await future;
      assert.ok(false, 'aborting a request should result in the promise rejecting');
    } catch (e) {
      assert.true(e instanceof Error);
    }
  });
});
