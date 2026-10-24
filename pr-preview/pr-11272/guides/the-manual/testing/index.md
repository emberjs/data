---
url: https://canary.warp-drive.io/pr-preview/pr-11272/guides/the-manual/testing.md
---

# Testing with Holodeck

[`@warp-drive/holodeck`](https://github.com/warp-drive-data/warp-drive/tree/main/packages/holodeck)
is the HTTP mock server ***Warp*Drive** uses for its own test suites. It records the responses a
test needs on the first run, writes them to disk, and replays them from disk on every run after
that.

:::danger 🛑 CANARY ONLY 🛑
Holodeck is still experimental and publishes to the `canary` channel only. Install it with an
exact version, as [Server setup](./server-setup.md) shows.
:::

## Holodeck runs a real server

Most browser mocking libraries answer `fetch` inside the page. Mirage, MSW, and Pretender all
work that way. Holodeck does not. It runs a Hono server over TLS and HTTP/2 on its own port, in a
worker thread next to your test server, and your tests make real cross-origin requests to it.

That choice buys you three things a page-level interceptor cannot give you.

* Every request appears in the DevTools network panel, with its real status, headers, and timing.
* Responses are really brotli-compressed and really served over HTTP/2, so compression and
  streaming behave the way they do in production.
* A request that aborts, redirects, or fails does so in the browser's own networking stack rather
  than in a stub.

It also costs you two things, and both are setup rather than test code. The server needs a locally
trusted TLS certificate, and it needs a port of its own. [Server setup](./server-setup.md) covers
both.

Running the mock inside ***Warp*Drive** rather than beside it is the other half of the argument.
***Warp*Drive** already knows your schemas and your request builders, so a mock library that shares
them can scope every request to a test, skip work in replay, and keep using the same builders your
application code uses.

:::tip More is planned
[Read the proposal](https://github.com/warp-drive-data/warp-drive/pull/11205) for more advanced
features, such as reusable mock scenarios and recording against a real API.
:::

## Record once, replay forever

A holodeck test declares what the server should say, then makes the request it would make in
production.

```ts
import { GET } from '@warp-drive/holodeck/mock';
import { buildBaseURL } from '@warp-drive/utilities';

await GET(this, 'users/1', () => ({
  data: { id: '1', type: 'user', attributes: { name: 'Chris Thoburn' } },
}));

const { content } = await store.request({ url: buildBaseURL({ resourcePath: 'users/1' }) });
```

What that `GET` call does depends on which mode the build is in.

In **record** mode it runs your response function, posts the result to the mock server, and the
server writes two files under `.mock-cache/`. One holds the response metadata as JSON. The other
holds the response body, brotli-compressed.

In **replay** mode it returns immediately. Your response function never runs. The request that
follows is served from the files on disk.

Recording is the default when you run tests locally. Replay is the default in CI. Nothing in the
test changes between the two.

```
record run                          replay run
  GET(this, 'users/1', fn)            GET(this, 'users/1', fn)
    fn() runs                           returns immediately, fn() never runs
    POST /__record                      no request
    server writes .mock-cache/…         nothing written

  store.request(…)                    store.request(…)
    GET /users/1?__xTestId=…            GET /users/1?__xTestId=…
    server writes nothing               server reads .mock-cache/…
    responds from the scaffold          responds from disk
```

Skipping the work is the point. A suite of two hundred replayed tests builds no payloads and
constructs no fixtures. You paid that cost once, when you wrote the test.

## Fixtures are source code

The `.mock-cache` directory belongs in version control. It is not build output, and nothing
regenerates it in CI.

Committing them is what makes the cache work. Git manages it, so switching branches switches the
fixtures with the tests they belong to, and a rebase or a CI run skips recording entirely because
the files are already there.

This catches people out because a local run always passes. Recording is on locally, so a test with
no committed fixture records one and goes green. The same test fails in CI, where replay is
enforced and the file is missing.

[Recording and replaying](./record-and-replay.md) covers the workflow that avoids this, including
the one command that reproduces CI's behavior before you push.

## Where to go next

* [Server setup](./server-setup.md) installs the package, the certificate, and the server.
* [Client setup](./client-setup.md) puts the handler in your request chain.
* [Test framework integration](./test-framework-integration.md) wires the test id and the host.
* [Common setups](./common-setups/index.md) puts the mock server on the test page's own origin,
  from Vite, from testem, or behind Caddy.
* [Writing mocks](./writing-mocks.md) covers the mock helpers and the rules for matching a request.
* [Recording and replaying](./record-and-replay.md) covers the modes, the fixtures, and CI.
* [Troubleshooting](./troubleshooting.md) is indexed by the error text you see.
