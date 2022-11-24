import { module, test } from 'qunit';

import { RequestManager } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Future, Handler, NextFn, StructuredErrorDocument } from '@ember-data/request/-private/types';

function isErrorDoc(e: Error | unknown | StructuredErrorDocument): e is StructuredErrorDocument {
  return Boolean(e && e instanceof Error && 'request' in e);
}
module('RequestManager | Error Propagation', function () {
  test('Errors thrown by a handler are catchable by the preceding handler', async function (assert) {
    assert.expect(4);
    const manager = new RequestManager();
    const catchingHandler: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.ok(true, 'catching handler triggered');
        try {
          // await to catch, else error is curried
          return await next(context.request);
        } catch (e) {
          assert.strictEqual((e as Error).message, 'Oops!', 'We caught the error');
          return 'We are happy' as T;
        }
      },
    };
    const throwingHandler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        assert.ok(true, 'throwing handler triggered');
        throw new Error('Oops!');
      },
    };
    manager.use([catchingHandler, throwingHandler]);
    const { data } = await manager.request({ url: '/wat' });
    assert.strictEqual(data, 'We are happy', 'we caught and handled the error');
  });

  test('Errors thrown by a handler curry the request properly', async function (assert) {
    assert.expect(4);
    const manager = new RequestManager();
    const curryingHandler: Handler = {
      request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.ok(true, 'catching handler triggered');
        return next({ url: '/curried' });
      },
    };
    const throwingHandler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        assert.ok(true, 'throwing handler triggered');
        throw new Error('Oops!');
      },
    };
    manager.use([curryingHandler, throwingHandler]);
    try {
      await manager.request({ url: '/initial' });
      assert.ok(false, 'we should throw');
    } catch (e) {
      assert.true(e instanceof Error, 'we throw an error');

      if (isErrorDoc(e)) {
        assert.deepEqual(e.request, { url: '/initial' }, 'we curried the request properly');
      }
    }
  });

  test('The `request` and `response` on errors is updated correctly when an error is not caught by the preceding handler', async function (assert) {
    assert.expect(4);
    const manager = new RequestManager();
    const catchingHandler: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.ok(true, 'catching handler triggered');
        return await next({ url: '/curried' });
      },
    };
    const throwingHandler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        assert.ok(true, 'throwing handler triggered');
        throw new Error('Oops!');
      },
    };
    manager.use([catchingHandler, throwingHandler]);
    try {
      await manager.request({ url: '/initial' });
      assert.ok(false, 'we should throw');
    } catch (e) {
      assert.true(e instanceof Error, 'we throw an error');

      if (isErrorDoc(e)) {
        assert.deepEqual(e.request, { url: '/initial' }, 'we curried the request properly');
      }
    }
  });

  test('Error documents are meaningfully serializable', async function (assert) {
    assert.expect(5);
    const manager = new RequestManager();
    const catchingHandler: Handler = {
      // @ts-expect-error
      async request<T>(context: Context, next: NextFn<T>): Promise<T> | Future<T> {
        assert.ok(true, 'catching handler triggered');
        return await next({ url: '/curried' });
      },
    };
    const throwingHandler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        assert.ok(true, 'throwing handler triggered');
        throw new Error('Oops!');
      },
    };
    manager.use([catchingHandler, throwingHandler]);
    try {
      await manager.request({ url: '/initial' });
      assert.ok(false, 'we should throw');
    } catch (e) {
      assert.true(e instanceof Error, 'we throw an error');

      if (isErrorDoc(e)) {
        assert.deepEqual(e.request, { url: '/initial' }, 'we curried the request properly');
      }

      const serialized = JSON.stringify(e);
      const hydrated = JSON.parse(serialized) as StructuredErrorDocument;
      assert.deepEqual(
        hydrated,
        { request: { url: '/initial' }, response: null, error: 'Oops!' } as StructuredErrorDocument,
        `meaningfully serialized as ${serialized}`
      );
    }
  });
});
