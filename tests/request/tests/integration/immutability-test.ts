import { module, test } from 'qunit';

import RequestManager from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Handler, NextFn } from '@ember-data/request/-private/types';

module('RequestManager | Immutability', function () {
  test('RequestInfo passed to a handler is Immutable', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context: Context, next: NextFn<T>) {
        return Promise.resolve<T>('hello' as T);
      },
    };
    manager.use([handler]);

    try {
      await manager.request({ url: '/foo', headers: new Headers([['foo', 'bar']]) });
    } catch (e) {}
  });
});
