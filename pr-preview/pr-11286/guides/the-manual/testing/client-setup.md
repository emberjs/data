---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/the-manual/testing/client-setup.md
---

# Client setup

Holodeck scopes every request to the test that made it, so that tests making identical requests can
run at the same time without reading each other's responses. It does this by decorating requests on
their way out, which means it needs a place in the request chain.

Add `MockServerHandler` to the `RequestManager` chain ahead of `Fetch`, or ahead of whichever
handler reaches the network.

## In a test

Each test typically builds its own store or `RequestManager`, so the handler goes in there.

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { module, test } from '@warp-drive/diagnostic';
import { MockServerHandler } from '@warp-drive/holodeck';
import { JSONAPICache } from '@warp-drive/json-api';

module('my module', function (hooks) {
  hooks.beforeEach(function () {
    const TestStore = useRecommendedStore({
      handlers: [new MockServerHandler(this)],
      cache: JSONAPICache,
      schemas: [/* … */],
    });

    this.store = new TestStore();
  });
});
```

A bare `RequestManager` takes the same handler.

```ts
import { Fetch, RequestManager } from '@warp-drive/core';
import { MockServerHandler } from '@warp-drive/holodeck';

const manager = new RequestManager().use([new MockServerHandler(this), Fetch]);
```

`this` is the test context object. Holodeck keys the test id off that object's identity, so the
object you pass here has to be the same one
[test framework integration](./test-framework-integration.md) passes to `setTestId`. Nothing checks
this at build time, and getting it wrong produces
`MockServerHandler is not configured with a testId` at request time.

## In your application's chain

If your app builds one chain and your tests reuse it, include the handler only in test builds.
`TESTING` is a build-time flag, so the handler and its import drop out of a production bundle
entirely.

```ts
import { Fetch, RequestManager } from '@warp-drive/core';
import { TESTING } from '@warp-drive/core/build-config/env';
import { MockServerHandler } from '@warp-drive/holodeck';

const manager = new RequestManager().use(
  [TESTING ? new MockServerHandler(testContext) : null, Fetch].filter(Boolean)
);
```

This still needs a test context to construct the handler with, so it suits a chain built per test
rather than one built at module scope.

## With legacy adapters

Requests issued by `@warp-drive/legacy` adapters do not travel through the request chain, so the
handler never sees them. Patch the store instead, once it exists.

```ts
import { installAdapterFor } from '@warp-drive/holodeck';

installAdapterFor(this, store);
```

Every adapter the store builds from then on routes its fetches through holodeck. The first argument
is the same test context again.

## What the handler does

Holodeck appends `__xTestId` and `__xTestRequestNumber` to the request URL, then forces
`mode: 'cors'`, `credentials: 'omit'`, and, when a `Content-Type` header is present, rewrites it to
`text/plain`.

That last rewrite is deliberate. It keeps the request inside the CORS "simple request" category, so
the browser skips the preflight `OPTIONS` round trip and the suite stays fast. The server parses the
body as JSON regardless of the header.

## Related

* [Test framework integration](./test-framework-integration.md) registers the test id the handler
  reads.
* [Writing mocks](./writing-mocks.md) declares the responses the server replays.
