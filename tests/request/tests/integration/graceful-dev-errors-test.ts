/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { module, test } from 'qunit';

import RequestManager from '@ember-data/request';
import { Handler } from '@ember-data/request/-private/types';

module('RequestManager | Graceful Errors', function () {
  test('We error meaningfully for `.use(<Handler>)`', function (assert) {
    const manager = new RequestManager();
    const handler = {
      request() {
        return Promise.resolve();
      },
    };
    try {
      // @ts-ignore-error
      manager.use(handler);
      assert.ok(false, 'we should error when not passing an array');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.true(
        /`RequestManager.use\(<Handler\[\]>\)` expects an array of handlers/.test((e as Error).message),
        `${(e as Error).message} does not match the expected error`
      );
    }
  });

  test('We error meaningfully if handlers are registered ex-post-facto', async function (assert) {
    const manager = new RequestManager();
    const handler = {
      request<T>() {
        return Promise.resolve('hello' as T);
      },
    };
    manager.use([handler]);
    await manager.request({ url: '/wat' });

    try {
      // @ts-ignore-error
      manager.use(handler);
      assert.ok(false, 'we should error when not passing an array');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        `Cannot add a Handler to a RequestManager after a request has been made`,
        (e as Error).message,
        `${(e as Error).message} does not match the expected error`
      );
    }
  });

  test('We error meaningfully if a handler does not implement request', function (assert) {
    const manager = new RequestManager();
    const handler = {
      request() {
        return Promise.resolve();
      },
    };
    try {
      // @ts-ignore-error
      manager.use(handler);
      assert.ok(false, 'we should error when not passing an array');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.true(
        /`RequestManager.use\(<Handler\[\]>\)` expects an array of handlers/.test((e as Error).message),
        `${(e as Error).message} does not match the expected error`
      );
    }
  });

  test('We error meaningfully if a handler does not return a promise', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>() {
        return 'hello' as T;
      },
    };
    // TODO figure out why Handler is acceptable here
    // despite it not returning a Promise<T>
    manager.use([handler]);

    try {
      await manager.request({ url: '/wat' });
      assert.ok(false, 'we should error when the handler returns undefined');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        `Expected handler.request to return a promise, instead received a synchronous value.`,
        (e as Error).message,
        `${(e as Error).message} does not match the expected error`
      );
    }
  });

  test('We error meaningfully if a handler returns undefined', async function (assert) {
    const manager = new RequestManager();
    const handler = {
      request() {
        return;
      },
    };
    // @ts-expect-error
    manager.use([handler]);

    try {
      await manager.request({ url: '/wat' });
      assert.ok(false, 'we should error when the handler returns undefined');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        `Expected handler.request to return a promise, instead received undefined.`,
        (e as Error).message,
        `${(e as Error).message} does not match the expected error`
      );
    }
  });

  test('We error meaningfully for empty requests', function (assert) {
    assert.ok(false, 'Not Implemented');
  });

  test('We error meaningfully for misshapen requests', function (assert) {
    assert.ok(false, 'Not Implemented');
  });

  test('We error meaningfully for invalid properties', function (assert) {
    assert.ok(false, 'Not Implemented');
  });
});
