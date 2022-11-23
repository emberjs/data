/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { module, test } from 'qunit';

import { RequestManager } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Handler, NextFn } from '@ember-data/request/-private/types';

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
    // @ts-expect-error
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

  test('We error meaningfully for empty requests', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(_context: Context, _next: NextFn<T>): Promise<T> {
        return Promise.resolve<T>('done' as T);
      },
    };
    manager.use([handler]);

    try {
      // @ts-expect-error
      await manager.request();
      assert.ok(false, 'we should error when the request is missing');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error when the request is missing');
      assert.strictEqual(
        (e as Error).message,
        'Expected RequestManager.request(<request>) to be called with a request, but none was provided.',
        `Expected: ${(e as Error).message} - to match the expected error`
      );
    }

    try {
      // @ts-expect-error
      await manager.request([]);
      assert.ok(false, 'we should error when the request is not an object');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error when the request is not an object');
      assert.strictEqual(
        (e as Error).message,
        'The `request` passed to `RequestManager.request(<request>)` should be an object, received `array`',
        `Expected: ${(e as Error).message} - to match the expected error`
      );
    }

    try {
      await manager.request({});
      assert.ok(false, 'we should error when the request has no keys');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error when the request has no keys');
      assert.strictEqual(
        (e as Error).message,
        'The `request` passed to `RequestManager.request(<request>)` was empty (`{}`). Requests need at least one valid key.',
        `Expected: ${(e as Error).message} - to match the expected error`
      );
    }
  });

  test('We error meaningfully for no handlers being present', async function (assert) {
    const manager = new RequestManager();

    try {
      await manager.request({ url: '/wat' });
      assert.ok(false, 'we should error when no handler is present');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        (e as Error).message,
        `No handler was able to handle this request.`,
        `Expected ${(e as Error).message} to match the expected error`
      );
    }
  });

  test('We error meaningfully for invalid next', async function (assert) {
    const manager = new RequestManager();
    const handler = {
      request<T>(req: Context, next: NextFn<T>) {
        return next(req.request);
      },
    };
    manager.use([handler]);
    try {
      await manager.request({ url: '/wat' });
      assert.ok(false, 'we should error when no handler is present');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        (e as Error).message,
        `No handler was able to handle this request.`,
        `Expected ${(e as Error).message} to match the expected error`
      );
    }
  });

  test('We error meaningfully for misshapen requests', async function (assert) {
    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(_context: Context, _next: NextFn<T>): Promise<T> {
        return Promise.resolve<T>('done' as T);
      },
    };
    manager.use([handler]);

    try {
      await manager.request({
        // @ts-expect-error
        url: true,
        // @ts-expect-error
        data: new Set(),
        // @ts-expect-error
        options: [],
        // @ts-expect-error
        cache: 'bogus',
        // @ts-expect-error
        credentials: 'never',
        // @ts-expect-error
        destination: 'space',
        // @ts-expect-error
        headers: new Map(),
        // @ts-expect-error
        integrity: false,
        // @ts-expect-error
        keepalive: 'yes',
        method: 'get',
        // @ts-expect-error
        mode: 'find-out',
        // @ts-expect-error
        redirect: 'of course',
        // @ts-expect-error
        referrer: null,
        // @ts-expect-error
        referrerPolicy: 'do-whatever',
      });
      assert.ok(false, 'we should error when the handler returns undefined');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        `Invalid Request passed to \`RequestManager.request(<request>)\`.

The following issues were found:

\tInvalidValue: key url should be a non-empty string, received boolean
\tInvalidValue: key options should be an object
\tInvalidValue: key cache should be a one of 'default', 'force-cache', 'no-cache', 'no-store', 'only-if-cached', 'reload', received bogus
\tInvalidValue: key credentials should be a one of 'include', 'omit', 'same-origin', received never
\tInvalidValue: key destination should be a one of '', 'object', 'audio', 'audioworklet', 'document', 'embed', 'font', 'frame', 'iframe', 'image', 'manifest', 'paintworklet', 'report', 'script', 'sharedworker', 'style', 'track', 'video', 'worker', 'xslt', received space
\tInvalidValue: key headers should be an instance of Headers, received map
\tInvalidValue: key integrity should be a non-empty string, received boolean
\tInvalidValue: key keepalive should be a boolean, received string
\tInvalidValue: key method should be a one of 'GET', 'PUT', 'PATCH', 'DELETE', 'POST', 'OPTIONS', received get
\tInvalidValue: key mode should be a one of 'same-origin', 'cors', 'navigate', 'no-cors', received find-out
\tInvalidValue: key redirect should be a one of 'error', 'follow', 'manual', received of course
\tInvalidValue: key referrer should be a non-empty string, received object
\tInvalidValue: key referrerPolicy should be a one of '', 'same-origin', 'no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url', received do-whatever`,
        (e as Error).message,
        `Expected\n\`\`\`\n${(e as Error).message}\n\`\`\` to match the expected error`
      );
    }
  });

  test('We error meaningfully for invalid properties', async function (assert) {
    const manager = new RequestManager();

    try {
      // @ts-expect-error
      await manager.request({ url: '/wat', random: 'field' });
      assert.ok(false, 'we should error when the handler returns undefined');
    } catch (e: unknown) {
      assert.true(e instanceof Error, 'We throw an error');
      assert.strictEqual(
        `Invalid Request passed to \`RequestManager.request(<request>)\`.

The following issues were found:

\tInvalidKey: 'random'`,
        (e as Error).message,
        `Expected\n\`\`\`\n${(e as Error).message}\n\`\`\` to match the expected error`
      );
    }
  });
});
