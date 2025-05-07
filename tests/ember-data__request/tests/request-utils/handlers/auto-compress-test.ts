import type { Future, Handler, NextFn, RequestContext, StructuredDataDocument } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import { AutoCompress, SupportsRequestStreams } from '@ember-data/request-utils/handlers';
import { module, test } from '@warp-drive/diagnostic';
import type { Diagnostic } from '@warp-drive/diagnostic/-types';

class AssertHandler implements Handler {
  declare assert: Diagnostic;
  constructor(assert: Diagnostic) {
    this.assert = assert;
  }

  request<T = unknown>(context: RequestContext, _next: NextFn<T>): Promise<T | StructuredDataDocument<T>> | Future<T> {
    this.assert.step(`[${context.request.method ?? '<GET>'}] ${context.request.url}`);
    return Promise.resolve(context.request) as Promise<T>;
  }
}

module('ember-data/request-utils/handlers/auto-compress', function (hooks) {
  test('It passes a stream when supported and activated', async function (assert) {
    const requestManager = new RequestManager().use([
      new AutoCompress({
        allowStreaming: true,
      }),
      new AssertHandler(assert),
    ]);

    const result = await requestManager.request<{ body: unknown }>({
      url: '/foo',
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
      options: {
        compress: true,
      },
    });

    assert.verifySteps(['[POST] /foo']);
    if (SupportsRequestStreams) {
      assert.true(result.content.body instanceof ReadableStream, 'response body is a stream');
    } else {
      assert.true(result.content.body instanceof Blob, 'response body is a blob');
    }
  });

  test('It does not pass a stream when not activated', async function (assert) {
    const requestManager = new RequestManager().use([
      new AutoCompress({
        allowStreaming: false,
      }),
      new AssertHandler(assert),
    ]);

    const result = await requestManager.request<{ body: unknown }>({
      url: '/foo',
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
      options: {
        compress: true,
      },
    });

    assert.verifySteps(['[POST] /foo']);
    assert.true(result.content.body instanceof Blob, 'response body is a blob');
  });

  test('It passes a compressed body', async function (assert) {
    const ALongString = 'a'.repeat(2000);
    const requestManager = new RequestManager().use([
      new AutoCompress({
        allowStreaming: false,
      }),
      new AssertHandler(assert),
    ]);

    const result = await requestManager.request<{ body: Blob }>({
      url: '/foo',
      method: 'POST',
      body: ALongString,
    });

    assert.verifySteps(['[POST] /foo']);
    assert.true(result.content.body instanceof Blob, 'response body is a blob');
    assert.true(result.content.body.size === 35, 'response body is the correct compressed length');

    const buffer = await result.content.body.arrayBuffer();
    const uintarr = new Uint8Array(buffer);
    const arr = Array.from(uintarr);
    assert.deepEqual(
      arr,
      [
        31, 139, 8, 0, 0, 0, 0, 0, 0, 19, 75, 76, 28, 5, 163, 96, 20, 140, 130, 81, 48, 10, 70, 193, 80, 7, 0, 57, 62,
        19, 168, 208, 7, 0, 0,
      ],
      'response body is the correct compressed content'
    );
  });

  test('It does not compress when below the threshold', async function (assert) {
    const ALongString = 'a'.repeat(999);
    const requestManager = new RequestManager().use([
      new AutoCompress({
        allowStreaming: false,
      }),
      new AssertHandler(assert),
    ]);

    const result = await requestManager.request<{ body: string }>({
      url: '/foo',
      method: 'POST',
      body: ALongString,
    });

    assert.verifySteps(['[POST] /foo']);
    assert.equal(typeof result.content.body, 'string', 'response body is a string');
    assert.equal(result.content.body.length, 999, 'response body is the correct compressed length');
    assert.equal(result.content.body, ALongString, 'response body is the correct uncompressed content');
  });
});
