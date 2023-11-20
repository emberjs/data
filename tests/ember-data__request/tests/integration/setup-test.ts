import RequestManager from '@ember-data/request';
import type { Context as HandlerRequestContext } from '@ember-data/request/-private/context';
import type { NextFn } from '@ember-data/request/-private/types';
import { module, test } from '@warp-drive/diagnostic';

module('RequestManager | Basic Setup', function () {
  test('We can call new RequestManager() with no args', function (assert) {
    const manager = new RequestManager();
    assert.ok(manager instanceof RequestManager, 'We instantiated');
  });

  test('We can call RequestManager.create() with no args', function (assert) {
    const manager = RequestManager.create();
    assert.ok(manager instanceof RequestManager, 'We instantiated');
  });

  test('We can register a handler with `.use(<Handler[]>)`', async function (assert) {
    const manager = new RequestManager();
    let calls = 0;
    manager.use([
      {
        request<T>(req: HandlerRequestContext, next: NextFn<T>) {
          calls++;
          return Promise.resolve('success!' as T);
        },
      },
    ]);
    const req = {
      url: '/foos',
    };
    const result = await manager.request(req);
    assert.equal(calls, 1, 'we called our handler');
    assert.equal(JSON.stringify(result.request), JSON.stringify(req));
    assert.equal(result.content, 'success!', 'we returned the expected result');
  });

  test('We can register multiple handlers with `.use(<Handler[]>)`', async function (assert) {
    const manager = new RequestManager();
    let calls = 0;
    let callsB = 0;
    manager.use([
      {
        async request<T>(req: HandlerRequestContext, next: NextFn<T>) {
          calls++;
          const outcome = await next(req.request);
          return outcome.content;
        },
      },
      {
        request<T>(req: HandlerRequestContext, next: NextFn<T>) {
          callsB++;
          return Promise.resolve('success!' as T);
        },
      },
    ]);
    const req = {
      url: '/foos',
    };
    const result = await manager.request<string>(req);
    assert.equal(calls, 1, 'we called our handler');
    assert.equal(callsB, 1, 'we called our next handler');
    assert.equal(JSON.stringify(result.request), JSON.stringify(req));
    assert.equal(result.content, 'success!', 'we returned the expected result');
  });

  test('We can register the same handler more than once with `.use(<Handler[]>)`', async function (assert) {
    const manager = new RequestManager();
    let calls = 0;

    const handler = {
      async request<T>(req: HandlerRequestContext, next: NextFn<T>) {
        calls++;
        if (calls === 2) {
          return Promise.resolve('success!' as T);
        }
        const outcome = await next(req.request);
        return outcome.content;
      },
    };

    manager.use([handler, handler]);
    const req = {
      url: '/foos',
    };
    const result = await manager.request<string>(req);
    assert.equal(calls, 2, 'we called our handler');
    assert.equal(JSON.stringify(result.request), JSON.stringify(req));
    assert.equal(result.content, 'success!', 'we returned the expected result');
  });
});
