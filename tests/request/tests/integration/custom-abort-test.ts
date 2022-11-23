import { module, test } from 'qunit';

import { RequestManager } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Future, Handler, NextFn, RequestInfo } from '@ember-data/request/-private/types';

module('RequestManager | Custom Abort', function () {
  test('We can abort requests', async function (assert) {
    assert.expect(4);
    const manager = new RequestManager();
    const controller = new AbortController();
    const handler: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal');
        assert.strictEqual(context.request.signal, controller.signal, 'we receive the correct signal');
        // @ts-expect-error
        assert.strictEqual(context.request.controller, undefined, 'we do not receive the controller');
        const result = await fetch(context.request.url!, context.request);

        return result.json() as T;
      },
    };
    manager.use([handler]);

    const future = manager.request({ url: '../assets/demo-fetch.json', controller });

    try {
      future.abort();
      await future;
      assert.ok(false, 'aborting a request should result in the promise rejecting');
    } catch (e) {
      assert.true(e instanceof Error);
    }
  });

  test('We can abort requests called via next', async function (assert) {
    assert.expect(7);
    const manager = new RequestManager();
    const controller = new AbortController();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        const future = next(context.request);
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler1');
        assert.strictEqual(context.request.signal, controller.signal, 'we receive the correct signal');
        // @ts-expect-error
        assert.strictEqual(context.request.controller, undefined, 'we do not receive the controller');
        return (await future).data;
      },
    };
    const handler2: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler2');
        assert.strictEqual(context.request.signal, controller.signal, 'we receive the correct signal');
        // @ts-expect-error
        assert.strictEqual(context.request.controller, undefined, 'we do not receive the controller');
        const result = await fetch(context.request.url!, context.request);

        return result.json() as T;
      },
    };
    manager.use([handler1, handler2]);

    const future = manager.request({ url: '../assets/demo-fetch.json', controller });

    try {
      future.abort();
      await future;
      assert.ok(false, 'aborting a request should result in the promise rejecting');
    } catch (e) {
      assert.true(e instanceof Error);
    }
  });

  test('We can provide a different abort controller from a handler', async function (assert) {
    assert.expect(3);
    const manager = new RequestManager();
    const handler1: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.true(context.request.signal instanceof AbortSignal, 'we receive the abort signal in handler1');
        const controller = new AbortController();
        const future = next(Object.assign({ controller }, context.request, { signal: controller.signal }));

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
        const controller = new AbortController();
        const future = next(Object.assign({ controller }, context.request));
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
