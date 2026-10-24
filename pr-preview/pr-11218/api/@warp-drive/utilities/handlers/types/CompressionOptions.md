---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/utilities/handlers/types/CompressionOptions.md
description: >-
  Options for `new AutoCompress()`: the compression format, size constraints and
  whether to stream the body.
---

# &#x20;CompressionOptions

```ts
interface CompressionOptions {
  allowStreaming?: boolean;
  constraints?: Constraints;
  forceStreaming?: boolean;
  format?: CompressionFormat;
}
```

Defined in: [-private/handlers/auto-compress.ts:79](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L79)

Options for configuring the [AutoCompress](../classes/AutoCompress.md) handler.

## Properties

### allowStreaming?

```ts
optional allowStreaming?: boolean;
```

Defined in: [-private/handlers/auto-compress.ts:115](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L115)

Some browsers support `ReadableStream` as a request body. This option
enables passing the compression stream as the request body instead of
the final compressed body when the browser supports doing so.

This comes with several caveats:

* the request will be put into `duplex: 'half'` mode. This should be
  transparent to you, but it is worth noting.
* the request mode cannot be `no-cors` as requests with a `ReadableStream`
  have no content length and thus are a new form of request that triggers
  cors requirements and a preflight request.
* http/1.x is not supported.

For additional reading about the restrictions of using `ReadableStream`
as a request body, see the [Chromium Documentation](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests#restrictions)

Streaming can be enabled per-request in browsers which support it by
setting `request.options.allowStreaming` to `true`.

Streaming can be forced even when the browser does not support it by setting
`request.options.forceStreaming` to `true`. This is useful if later handlers
in the chain can handle the request body as a stream.

#### Default

```ts
false
```

***

### constraints?

```ts
optional constraints?: Constraints;
```

Defined in: [-private/handlers/auto-compress.ts:157](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L157)

The constraints for the request body. This is used to determine
whether to compress the request body or not.

The defaults are:

```ts
{
  Blob: 1000, // blob.size
  ArrayBuffer: 1000, // buffer.byteLength
  TypedArray: 1000, // array.byteLength
  DataView: 1000, // view.byteLength
  String: 1000, // string.length
}
```

The following body types are never compressed unless explicitly
configured by the request:

* `FormData`
* `URLSearchParams`
* `ReadableStream`

A request.options.compress value of `false` will disable
compression for a request body of any type. While a value of
`true` will enable compression for the request.

An undefined value will use the default, a value of `0` will
enable compression for all values, and a value of `-1` will
disable compression.

***

### forceStreaming?

```ts
optional forceStreaming?: boolean;
```

Defined in: [-private/handlers/auto-compress.ts:124](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L124)

If `true`, the request will be forced into streaming mode even
if the browser does not support it. This is useful if later handlers
in the chain can handle the request body as a stream.

#### Default

```ts
false
```

***

### format?

```ts
optional format?: CompressionFormat;
```

Defined in: [-private/handlers/auto-compress.ts:87](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L87)

The compression format to use. Must be a valid
compression format supported by [CompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)

The default is `gzip`.
