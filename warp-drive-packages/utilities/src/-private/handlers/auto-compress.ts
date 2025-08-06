import { assert } from '@warp-drive/core/build-config/macros';
import type { Future, Handler, NextFn } from '@warp-drive/core/request';
import type { HTTPMethod, RequestContext } from '@warp-drive/core/types/request';

function isCompressibleMethod(method?: HTTPMethod): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

/**
 * Whether the browser supports `ReadableStream` as a request body
 * in a `POST` request.
 *
 * @group Constants
 */
export const SupportsRequestStreams: boolean = (() => {
  let duplexAccessed = false;

  const hasContentType = new Request('', {
    body: new ReadableStream(),
    method: 'POST',
    // @ts-expect-error untyped
    get duplex() {
      duplexAccessed = true;
      return 'half';
    },
  }).headers.has('Content-Type');

  return duplexAccessed && !hasContentType;
})();

interface Constraints {
  /**
   * The minimum size at which to compress blobs
   *
   * @default 1000
   */
  Blob?: number;
  /**
   * The minimum size at which to compress array buffers
   *
   * @default 1000
   */
  ArrayBuffer?: number;
  /**
   * The minimum size at which to compress typed arrays
   *
   * @default 1000
   */
  TypedArray?: number;
  /**
   * The minimum size at which to compress data views
   *
   * @default 1000
   */
  DataView?: number;
  /**
   * The minimum size at which to compress strings
   *
   * @default 1000
   */
  String?: number;
}

/**
 * Options for configuring the AutoCompress handler.
 *
 */
interface CompressionOptions {
  /**
   * The compression format to use. Must be a valid
   * compression format supported by [CompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)
   *
   * The default is `gzip`.
   *
   */
  format?: CompressionFormat;

  /**
   * Some browsers support `ReadableStream` as a request body. This option
   * enables passing the compression stream as the request body instead of
   * the final compressed body when the browser supports doing so.
   *
   * This comes with several caveats:
   *
   * - the request will be put into `duplex: 'half'` mode. This should be
   *   transparent to you, but it is worth noting.
   * - the request mode cannot be `no-cors` as requests with a `ReadableStream`
   *   have no content length and thus are a new form of request that triggers
   *   cors requirements and a preflight request.
   * - http/1.x is not supported.
   *
   * For additional reading about the restrictions of using `ReadableStream`
   * as a request body, see the [Chromium Documentation](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests#restrictions)
   *
   * Streaming can be enabled per-request in browsers which support it by
   * setting `request.options.allowStreaming` to `true`.
   *
   * Streaming can be forced even when the browser does not support it by setting
   * `request.options.forceStreaming` to `true`. This is useful if later handlers
   * in the chain can handle the request body as a stream.
   *
   * @default false
   */
  allowStreaming?: boolean;

  /**
   * If `true`, the request will be forced into streaming mode even
   * if the browser does not support it. This is useful if later handlers
   * in the chain can handle the request body as a stream.
   *
   * @default false
   */
  forceStreaming?: boolean;

  /**
   * The constraints for the request body. This is used to determine
   * whether to compress the request body or not.
   *
   * The defaults are:
   *
   * ```ts
   * {
   *   Blob: 1000, // blob.size
   *   ArrayBuffer: 1000, // buffer.byteLength
   *   TypedArray: 1000, // array.byteLength
   *   DataView: 1000, // view.byteLength
   *   String: 1000, // string.length
   * }
   * ```
   *
   * The following body types are never compressed unless explicitly
   * configured by the request:
   * - `FormData`
   * - `URLSearchParams`
   * - `ReadableStream`
   *
   * A request.options.compress value of `false` will disable
   * compression for a request body of any type. While a value of
   * `true` will enable compression for the request.
   *
   * An undefined value will use the default, a value of `0` will
   * enable compression for all values, and a value of `-1` will
   * disable compression.
   *
   */
  constraints?: Constraints;
}

const DEFAULT_CONSTRAINTS = {
  Blob: 1000,
  ArrayBuffer: 1000,
  TypedArray: 1000,
  DataView: 1000,
  String: 1000,
};
const TypedArray = Object.getPrototypeOf(Uint8Array.prototype) as typeof Uint8Array;

/**
 * A request handler that automatically compresses the request body
 * if the request body is a string, array buffer, blob, or form data.
 *
 * This uses the [CompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)
 *
 * The compression format as well as the kinds of data to compress can be
 * configured using the `format` and `constraints` options.
 *
 * ```diff
 * +import { AutoCompress } from '@ember-data/request-utils/handlers';
 * import Fetch from '@ember-data/request/fetch';
 * import RequestManager from '@ember-data/request';
 * import Store from '@ember-data/store';
 *
 * class AppStore extends Store {
 *   requestManager = new RequestManager()
 *     .use([
 * +       new AutoCompress(),
 *        Fetch
 *     ]);
 * }
 * ```
 *
 * @group Handlers
 * @public
 * @since 5.5.0
 */
export class AutoCompress implements Handler {
  declare options: Required<CompressionOptions> & { constraints: Required<Constraints> };

  constructor(options: CompressionOptions = {}) {
    const opts = {
      format: options.format ?? 'gzip',
      constraints: Object.assign({}, DEFAULT_CONSTRAINTS, options.constraints),
      allowStreaming: options.allowStreaming ?? false,
      forceStreaming: options.forceStreaming ?? false,
    };
    this.options = opts;
  }

  request<T>({ request }: RequestContext, next: NextFn<T>): Promise<T> | Future<T> {
    const { constraints } = this.options;
    const { body } = request;

    const shouldCompress =
      isCompressibleMethod(request.method) &&
      request.options?.compress !== false &&
      // prettier-ignore
      (request.options?.compress ? true
      : typeof body === 'string' || body instanceof String ? canCompress('String', constraints, body.length)
      : body instanceof Blob ? canCompress('Blob', constraints, body.size)
      : body instanceof ArrayBuffer ? canCompress('ArrayBuffer', constraints, body.byteLength)
      : body instanceof DataView ? canCompress('DataView', constraints, body.byteLength)
      : body instanceof TypedArray ? canCompress('TypedArray', constraints, body.byteLength)
      : false);

    if (!shouldCompress) return next(request);

    // A convenient way to convert all of the supported body types to a readable
    // stream is to use a `Response` object body
    const response = new Response(request.body);
    const stream = response.body?.pipeThrough(new CompressionStream(this.options.format));
    const headers = new Headers(request.headers);
    headers.set('Content-Encoding', encodingForFormat(this.options.format));

    //
    // For browsers that support it, `fetch` can receive a `ReadableStream` as
    // the body, so all we need to do is to create a new `ReadableStream` and
    // compress it on the fly
    //
    const forceStreaming = request.options?.forceStreaming ?? this.options.forceStreaming;
    const allowStreaming = request.options?.allowStreaming ?? this.options.allowStreaming;
    if (forceStreaming || (SupportsRequestStreams && allowStreaming)) {
      const req = Object.assign({}, request, {
        body: stream,
        headers,
      });
      if (SupportsRequestStreams) {
        // @ts-expect-error untyped
        req.duplex = 'half';
      }

      return next(req);

      //
      // For non-chromium browsers, we have to "pull" the stream to get the final
      // bytes and supply the final byte array as the new request body.
      //
    }

    // we need to pull the stream to get the final bytes
    const resp = new Response(stream);
    return resp.blob().then((blob) => {
      const req = Object.assign({}, request, {
        body: blob,
        headers,
      });
      return next(req);
    }) as Promise<T>;
  }
}

function canCompress(type: keyof Constraints, constraints: Required<Constraints>, size: number): boolean {
  // if we have a value of 0, we can compress anything
  if (constraints[type] === 0) return true;
  if (constraints[type] === -1) return false;
  return size >= constraints[type];
}

function encodingForFormat(format: CompressionFormat): string {
  switch (format) {
    case 'gzip':
    case 'deflate':
    case 'deflate-raw':
      return format;
    default:
      assert(`Unsupported compression format: ${format as unknown as string}`);
      // @ts-expect-error - unreachable code is reachable in production
      return format;
  }
}
