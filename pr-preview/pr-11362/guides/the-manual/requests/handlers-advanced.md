---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/guides/the-manual/requests/handlers-advanced.md
description: >-
  Learn what a request handler receives and can return, how handlers run in
  order, how responses and streams pass along the chain, and how to retry errors
  and handle aborts.
---

# Advanced Handlers

A handler is one step in the chain a [RequestManager](/api/@warp-drive/core/classes/RequestManager)
runs every request through. [Handlers](./handlers.md) walks through writing a first one. This page
explains how handlers work in detail, then how to use that to retry failed requests and handle
aborts.

## What a Handler Receives and Returns

A handler is any object with a `request(context, next)` method. The method must return a promise,
so most handlers are `async` functions; in development, returning anything else throws.

It receives two arguments:

* **`context`** describes the request being handled:
  * `context.request` is the request: its `url`, `method`, `headers`, `signal` and any other
    [request options](./index.md#request-options). It is read-only, and in development it is
    frozen. To change it, pass a copy to `next`, such as
    `Object.assign({}, context.request, { headers })`, and build new headers with
    `new Headers(context.request.headers)`.
  * `context.setResponse(response)` records the response for this handler: a native `Response`,
    or an object with the same `status`, `headers` and other fields. Call it at most once.
  * `context.setStream(stream)` gives the application a stream of the response body. Call it at
    most once. [Passing Streams Along the Chain](#passing-streams-along-the-chain) explains when
    you need it.
* **`next(request)`** passes a request on to the next handler. It returns a
  [Future](/api/@warp-drive/core/request/types/Future), a promise that resolves with
  `{ request, response, content }` or rejects with an error.

A handler either answers the request itself or calls `next` and returns what it gets back. It can
return:

* **Any value.** That value becomes the request's `content`.
* **The `{ request, response, content }` object that `next` resolved with.** Its `content` becomes
  the request's `content`; the `request` and `response` are this handler's own, as
  [What a Handler Sees of the Response](#what-a-handler-sees-of-the-response) describes.
* **The Future that `next` returned**, without awaiting it. The request's content, response and
  stream all come straight from the next handler, and so do its errors.

In the examples on this page, `T` is the type of the request's content.

This handler answers requests for `/settings` from `localStorage` and passes every other request
along:

```ts [settings-handler.ts]
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

export const SettingsHandler: Handler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    if (context.request.url !== '/settings') {
      return next(context.request);
    }

    context.setResponse(new Response(null, { status: 200 }));
    return Promise.resolve(JSON.parse(localStorage.getItem('settings') ?? '{}') as T);
  },
};
```

The API docs for [Handler](/api/@warp-drive/core/request/types/Handler),
[NextFn](/api/@warp-drive/core/request/types/NextFn) and
[RequestContext](/api/@warp-drive/core/types/request/types/RequestContext) have the full
signatures.

## Handler Order

`use` registers handlers in the order they will run:

```ts
const manager = new RequestManager().use([A, B, C]);
```

A request goes to `A` first. When `A` calls `next`, the request goes to `B`, and when `B` calls
`next`, it goes to `C`. The last handler must answer the request itself; in development, calling
`next` from it throws "No handler was able to handle this request". The result then travels back
the other way: `C`'s result is what `B`'s `next` call resolves with, and what `A` returns is what
the application receives.

You can call `use` more than once, and each call adds to the end of the list. Register every
handler before the first request; in development, calling `use` after that throws. Registering
them all in one call keeps the order easy to see. A cache handler registered with
[useCache](/api/@warp-drive/core/classes/RequestManager#usecache), such as the
[CacheHandler](/api/@warp-drive/core/variables/CacheHandler) a `Store` uses, always runs before
all of them, so it can answer a request from the cache before any other handler sees it. See
[Caching](../caching/index.md) for how it decides.

## What a Handler Sees of the Response

Awaiting `next` gives a handler an object of the same `{ request, response, content }` shape the
application gets, described in [Using The Response](./using-the-response.md). From inside the chain:

* **`request`** is the request this handler passed to `next`, not the one the application made.
  Each handler's own result carries the request it received, so the application always gets back
  its original request.
* **`response`** is the response a later handler recorded with `setResponse`, or `null` if none
  did. When that was a native `Response`, as it is for the
  [Fetch](/api/@warp-drive/core/variables/Fetch) handler, this is a read-only copy of its `status`,
  `statusText`, `ok`, `headers`, `url`, `type` and `redirected`, called a
  [ResponseInfo](/api/@warp-drive/core/types/request/types/ResponseInfo). It has no body: the Fetch
  handler has already read the body into `content`. Treat it as read-only. In development its
  `headers` throw if you change them; `headers.clone()` returns an editable copy.
* **`content`** is whatever the next handler returned.

If a handler does not call `setResponse` and calls `next` exactly once, the response from `next`
becomes its own response. If it calls `next` more than once, its response is `null` unless it sets
one or returns a Future from `next`.

This handler logs each request's status and duration and returns the content unchanged:

```ts [timing-handler.ts]
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

export const TimingHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn<T>) {
    const start = performance.now();
    const { response, content } = await next(context.request);

    console.log(`${context.request.url}: ${response?.status} in ${performance.now() - start}ms`);
    return content;
  },
};
```

When `next` rejects, the error carries the same `request` and `response`, plus the `content`
received before the failure, if any. The
[StructuredDocument](/api/@warp-drive/core/types/request/types/StructuredDocument) API docs have
both shapes.

## Passing Streams Along the Chain

`await fetch()` resolves as soon as the response headers arrive, so the application can read the
body while it downloads. `await manager.request()` resolves only after the handlers have read the
body. To read it as it arrives, the application calls `getStream()` on the Future, which resolves
with a [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of the
body, or `null`. The Fetch handler only creates that stream when the application asks for it.

Each handler's result has its own stream, which the handler sets with `context.setStream`. It can
do so at most once, at any time until its `request` method resolves. So a handler that awaits
`next` should hand the next handler's stream along right away:

```ts
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

export const LoggingHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn<T>) {
    const future = next(context.request);
    context.setStream(future.getStream()); // pass the stream along now

    const { content } = await future;
    console.log(`loaded ${context.request.url}`);
    return content;
  },
};
```

Without that line, the next handler's stream is only passed along once this handler has
finished, as the next section describes. By then the whole body has downloaded, which defeats the
point of streaming it.

A handler that calls `next` more than once has several streams. It can pick one to pass along,
combine them into one or set none. A handler that reads the stream itself can pass along a
different stream, or none.

## Automatic Currying of Stream and Response

"Currying" here is not the functional-programming term. It means a handler's result takes its
response, stream or content from the result of its `next` call. ***Warp*Drive** does this for you in the common case of a handler that calls
`next` once:

* **Response:** if the handler never calls `setResponse`, it gets the response from `next`, as
  [What a Handler Sees of the Response](#what-a-handler-sees-of-the-response) describes.
* **Stream:** if the handler never calls `setStream` and never calls `getStream` on the Future from
  `next`, it gets the stream from `next` once it finishes.
* **Everything, immediately:** if the handler returns the Future from `next` itself, its content,
  response, errors and stream all come from that Future, and the stream is passed along at once.

The last case only applies when the `request` method returns the Future itself. An `async`
function always returns a new promise, so `async request(context, next) { return next(context.request); }`
gets the first two behaviors but not the third. To pass everything along at once, drop `async`:

```ts
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

export const PassThroughHandler: Handler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    return next(context.request);
  },
};
```

## Handling Errors

When a handler later in the chain throws, the error rejects the `next` call of each handler
before it, in reverse order. So each handler can catch errors from the handlers after it and
choose to handle the error, re-throw it or throw a new one.

This handler retries a request that timed out. It checks the request's `signal` first, so a
request the application aborted is never retried.

```ts [retry-handler.ts]
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

const MAX_RETRIES = 5;

// The Fetch handler rejects with a FetchError whose `status` is the
// response's HTTP status. Choose the errors worth retrying for your API.
function isTimeoutError(e: unknown): boolean {
  const error = e as { isRequestError?: boolean; status?: number };
  return error.isRequestError === true && (error.status === 408 || error.status === 504);
}

export const RetryHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn<T>) {
    let attempts = 0;

    while (true) {
      attempts++;
      try {
        const result = await next(context.request);
        // after more than one call to next, the response is not passed along for us
        context.setResponse(result.response);
        return result;
      } catch (e) {
        // never retry a request that was aborted
        if (context.request.signal?.aborted) throw e;

        if (isTimeoutError(e) && attempts < MAX_RETRIES) {
          continue;
        }
        throw e;
      }
    }
  },
};
```

Because it may call `next` more than once, the handler sets the response itself; otherwise the
application would get a `null` response for any request that needed a retry.

Register it before the handler that makes the request, so that handler's errors reach it:

```ts
import { RequestManager, Fetch } from '@warp-drive/core';
import { RetryHandler } from './retry-handler';

const manager = new RequestManager().use([RetryHandler, Fetch]);
```

The [FetchError](/api/@warp-drive/core/types/request/types/FetchError) API docs list the other
properties on errors from `Fetch`, such as `statusText` and `code`. The example retries at once;
add a delay between attempts if your API needs one, and retry only requests that are safe to
repeat.

## Handling Abort

Aborting a request rejects the current handler in the chain, and every handler before it can
catch that error just like any other. A handler that needs to tell an abort apart from other
errors should check `context.request.signal.aborted`, or `controller.signal.aborted` if it
supplied its own controller (see below).

A handler can use this to recover from an abort and still proceed. As a best practice, use it
only for necessary cleanup, and re-throw the original `AbortError` when the abort came from
the root controller.

### AbortControllers are Always Present and Always Entangled

The **root controller** is the [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
for the whole request: the one passed as `controller` to `manager.request` or `store.request`,
or, if none was, one that ***Warp*Drive** creates. Calling `abort()` on the request's `Future`
aborts it. Its [signal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) is on
`context.request.signal` for every handler in the chain, unless an earlier handler supplied its
own controller.

A handler can give the rest of the chain its own controller by passing it as the request's
`controller` when calling `next`, along with its `signal`. ***Warp*Drive** entangles the new
controller with the root controller: if the root controller aborts, so does the new one. The
reverse is not true. Aborting the new controller rejects that `next` call, but the root
controller and the rest of the request keep going, so a handler can abort one part of the
work it does without aborting the whole request.

```ts
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

export const TimeLimitHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn<T>) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      return await next(
        Object.assign({}, context.request, { controller, signal: controller.signal })
      );
    } catch (e) {
      // our own signal is the root's (or an earlier handler's);
      // if it aborted, the abort did not come from us, so pass it on
      if (context.request.signal?.aborted) throw e;

      // only our controller aborted: fall back instead of failing
      return next(Object.assign({}, context.request, { url: '/api/fallback' }));
    } finally {
      clearTimeout(timer);
    }
  },
};
```

Pass `signal` as well as `controller`: the request a handler receives already has a `signal`,
and without overriding it the next handler keeps the old one.
