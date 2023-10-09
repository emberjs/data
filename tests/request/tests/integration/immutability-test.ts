import { module, test } from '@warp-drive/diagnostic';

import RequestManager from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Handler, NextFn } from '@ember-data/request/-private/types';

module('RequestManager | Immutability', function () {
  test('RequestInfo passed to a handler is Immutable', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        // @ts-expect-error
        context.request.integrity = 'some val';
        return Promise.resolve<T>('hello' as T);
      },
    };
    manager.use([handler]);

    try {
      await manager.request({ url: '/foo', headers: new Headers([['foo', 'bar']]) });
      assert.ok(false, 'we should have erred');
    } catch (e) {
      assert.true(
        (e as Error).message === `can't define property "integrity": Object is not extensible` || // firefox
          (e as Error).message === 'Cannot add property integrity, object is not extensible', // chrome
        `expected ${(e as Error).message} to match the expected error`
      );
    }
  });
  test('Headers in RequestInfo passed to a handler are Immutable', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        context.request.headers!.append('house', 'home');
        return Promise.resolve<T>('hello' as T);
      },
    };
    manager.use([handler]);

    try {
      await manager.request({ url: '/foo', headers: new Headers([['foo', 'bar']]) });
      assert.ok(false, 'we should have erred');
    } catch (e) {
      assert.equal(
        (e as Error).message,
        'Cannot Mutate Immutatable Headers, use headers.clone to get a copy',
        `expected ${(e as Error).message} to match the expected error`
      );
    }
  });
  test('Headers in RequestInfo passed to a handler may be edited after cloning', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        const headers = new Headers(context.request.headers);
        headers.append('house', 'home');
        return Promise.resolve<T>([...headers.entries()] as T);
      },
    };
    manager.use([handler]);

    const { content: headers } = await manager.request({ url: '/foo', headers: new Headers([['foo', 'bar']]) });
    assert.deepEqual(headers, [
      ['foo', 'bar'],
      ['house', 'home'],
    ]);
  });
});
