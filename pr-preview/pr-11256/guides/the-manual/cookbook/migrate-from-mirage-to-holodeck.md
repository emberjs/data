---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/guides/the-manual/cookbook/migrate-from-mirage-to-holodeck.md
description: >-
  Convert an ember-cli-mirage or miragejs test suite to Holodeck mocks one test
  at a time, with fixtures committed under .mock-cache and replay enforced in
  CI.
---

# Migrating from Mirage to Holodeck

This recipe is for teams whose tests use ember-cli-mirage or miragejs and who want to move them to
[Holodeck](/guides/the-manual/testing/index.md). It converts one test first, then maps the Mirage
patterns you will meet next onto Holodeck mocks. At the end, Holodeck answers the requests Mirage
used to answer, the recorded fixtures are committed under `.mock-cache`, and CI replays them.

## Before you start

Check these before you convert the first test.

* Holodeck is installed and starts next to your test server, as
  [Server setup](/guides/the-manual/testing/server-setup.md) describes. That page lists the
  package, its peer dependencies, and the Node version it needs.
* `mkcert` is installed and the local certificate exists. See
  [Trust a local certificate](/guides/the-manual/testing/server-setup.md#trust-a-local-certificate).
* Every request you want to mock goes through the [`RequestManager`](/api/@warp-drive/core/classes/RequestManager), with `MockServerHandler` in the
  chain, or through a legacy adapter patched with `installAdapterFor`.
  [Client setup](/guides/the-manual/testing/client-setup.md) shows both.
* This page replaces Mirage in tests. If Mirage also serves your app under `ember serve`, that
  stays as it is for now. Replacing it there is scoped by the HoloPrograms RFC
  ([#11205](https://github.com/warp-drive-data/warp-drive/pull/11205)).
* Your requests carry no headers beyond `Accept` and `Content-Type`. The mock server's CORS
  preflight rejects any other header, `Authorization` included. See
  [`TypeError: Failed to fetch` from a legacy adapter](#typeerror-failed-to-fetch-from-a-legacy-adapter).

Mirage has no such requirement. Its Pretender interceptor replaces `XMLHttpRequest` and
`window.fetch` inside the page, so it catches every request. Holodeck sees only the requests its
handler decorates. Code that calls `fetch` directly, including an app service that wraps `fetch`,
is not mocked. Move those calls onto the [`RequestManager`](/guides/the-manual/requests/index.md)
before you convert the tests that depend on them.

## How a Holodeck mock differs from a Mirage route

A Mirage route handler runs on every request, in every run, and computes its response from an
in-memory database. A Holodeck mock is declared inside one test, for one request. Its response
function runs only while recording, and the result is written to disk as a fixture. Replay serves
that fixture and never calls the function. Holodeck has no route table, no database, and none of
your code runs per request.

Two rules follow from that. First, the fixture key counts earlier requests with the same method
and URL. Two requests to the same URL in one test need two mocks, declared in the order the
requests happen. Second, a mock the
test declares but never requests fails the test. Mirage let unused routes sit in `mirage/config.js`.
Holodeck treats an unused mock as a mistake.
[Recording and replaying](/guides/the-manual/testing/record-and-replay.md) covers the two modes, and
[Writing mocks](/guides/the-manual/testing/writing-mocks.md) covers the matching rules.

## Convert one test

Pick a rendering test that seeds data with `server.createList` and renders a component that makes
one [`GET`](/api/@warp-drive/holodeck/mock/functions/GET). Here is the Mirage version.

```js
import { setupMirage } from 'ember-cli-mirage/test-support';

module('Integration | Component | post-list', function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test('pagination reports the true total', async function (assert) {
    this.server.createList('post', 25, { authorId: '42' });
    await render(hbs`<PostList @authorId="42" />`);
    assert.dom('[data-test-pagination]').includesText('of 25 entries');
  });
});
```

The total in that test comes from a Mirage handler that filters the database, slices one page, and
computes `meta`. Holodeck does none of that, so the Holodeck version declares the page the
component asks for, already filtered and with its `meta` written out.

```js
import { installAdapterFor } from '@warp-drive/holodeck';
import { GET } from '@warp-drive/holodeck/mock';

function post(i) {
  return { type: 'posts', id: String(i), attributes: { 'author-id': '42', title: `Post ${i}` } };
}

module('Integration | Component | post-list', function (hooks) {
  setupRenderingTest(hooks);
  hooks.beforeEach(function () {
    installAdapterFor(this, this.owner.lookup('service:store'));
  });

  test('pagination reports the true total', async function (assert) {
    await GET(this, 'api/posts?author=42&page=1&per_page=10', () => ({
      data: Array.from({ length: 10 }, (_, i) => post(i + 1)),
      meta: { total: 25 },
    }));
    await render(hbs`<PostList @authorId="42" />`);
    assert.dom('[data-test-pagination]').includesText('of 25 entries');
  });
});
```

The `beforeEach` hook is for an app on legacy adapters. If your store's `RequestManager` already
has `MockServerHandler` in its chain, leave the hook out.

The URL is the path the app requests, without the origin and without a leading slash. Mirage's
`namespace` becomes part of that path, so an app whose requests go to `api` declares
`api/...`. The query string has to be the exact string the app sends. If you are not sure what
it is, run the test. Through `MockServerHandler`, the failure message names the URL the app really
requested. Through a legacy adapter it does not, so read the request in the browser's network panel.

The mock helpers `GET`, [`POST`](/api/@warp-drive/holodeck/mock/functions/POST), [`PATCH`](/api/@warp-drive/holodeck/mock/functions/PATCH), [`PUT`](/api/@warp-drive/holodeck/mock/functions/PUT), [`DELETE`](/api/@warp-drive/holodeck/mock/functions/DELETE), and [`HEAD`](/api/@warp-drive/holodeck/mock/functions/HEAD) come from
`@warp-drive/holodeck/mock`.
[`setConfig`](/api/@warp-drive/holodeck/functions/setConfig), `setTestId`, and `installAdapterFor` come from `@warp-drive/holodeck`. The module no
longer calls `setupMirage`. Instead, the test suite registers a test id once, in
`tests/test-helper.js`, and points Holodeck at the mock server.

```js
import { setConfig, setTestId } from '@warp-drive/holodeck';

setConfig({ host: MockHost });
QUnit.hooks.beforeEach(function (assert) {
  setTestId(this, assert.test.testId);
});
QUnit.hooks.afterEach(function () {
  setTestId(this, null);
});
```

`MockHost` is the mock server's origin, `https://localhost:<port>`, with the port your test runner
passed to `launchProgram`. The app's own requests have to go to `MockHost` too, because Holodeck
never rewrites a request's host. For request builders, `setBuildURLConfig({ host: MockHost, namespace })`
does that, with the namespace your app already uses, because the call replaces both fields. For legacy adapters, set `host` on the adapters in the test environment, as
[Legacy adapters](#legacy-adapters) shows.
[Test framework integration](/guides/the-manual/testing/test-framework-integration.md) sets both
hosts and explains why they are two calls.

Mirage answered requests inside the page, so a placeholder host such as `https://test` worked.
While Mirage tests and Holodeck tests share one suite, an app-wide host change breaks the Mirage
tests, because a Mirage route matches only the `urlPrefix` Mirage was given. Either set Mirage's
`urlPrefix` to `MockHost` as well, or point the app at `MockHost` only in converted modules, in
a `beforeEach`.

Now record, replay, and commit.

1. Run the test locally with `CI` unset. That run records, so the `GET` call posts its response
   to the server and the test passes.

2. Look in `.mock-cache/` in the test app's directory. The server wrote one directory per request,
   holding the status and headers in `res.meta.json` and the compressed payload in `res.body.br`.

   ```
   .mock-cache/
     <test id>/
       GET::api_posts?author=42&page=1&per_page=10::0/
         res.meta.json
         res.body.br
   ```

3. Run the test in replay mode. Replay is compiled into the build, so build and run with `CI=1`,
   as
   [Prove replay works before you push](/guides/the-manual/testing/record-and-replay.md#prove-replay-works-before-you-push)
   shows. The response function does not run, and the server answers from the fixture.

4. Commit `.mock-cache` in the same change as the test.

## Patterns

### Lists and factories

A factory becomes a plain function that returns a JSON:API resource object, like `post` above,
or one of your app's own payload builders. `server.createList` becomes a response function that
maps over the ids you need. Assertions that read `server.db` read the constants the test declared
instead, so the seed and the assertion share one value. Values that a factory drew from faker or
the current date are recorded once and replay unchanged, so write fixed values instead.

### A POST with a body

A Mirage handler that parsed `request.requestBody` becomes a mock that matches on the body. The
`body` option must be the exact string the app sends, so build it with `JSON.stringify` and write
out every attribute your serializer emits, in its order.

```js
import { POST } from '@warp-drive/holodeck/mock';

const body = JSON.stringify({
  data: { type: 'posts', attributes: { title: 'Hello holodeck', body: 'First post' } },
});

await POST(this, 'api/posts', () => ({
  data: { type: 'posts', id: '999', attributes: { title: 'Hello holodeck', body: 'First post' } },
}), { body });
```

A test that captured the body to assert on it no longer needs to. A request with a different body
has no matching fixture and fails. Assert on what the page shows after the save instead. When the
serializer's output changes, update the `body` string in each mock, because the fixture for the
old body no longer matches.
[Match a request that has a body](/guides/the-manual/testing/writing-mocks.md#match-a-request-that-has-a-body)
explains the hashing.

### Query strings

Mirage routes matched a path and let the handler read `request.queryParams`. Holodeck matches the
path and the query string together, as text. Declare one mock per query the test makes, with the
parameters in the order the app sends them, and return data that is already filtered.

```js
await GET(this, 'api/posts?author=42&sort=-created-at', () => ({
  data: [1, 2, 3].map((i) => ({ type: 'posts', id: String(i), attributes: { 'author-id': '42' } })),
}));
```

Square brackets, as in JSON:API filters, must be percent-encoded. See
[Write the URL the way the server will see it](/guides/the-manual/testing/writing-mocks.md#write-the-url-the-way-the-server-will-see-it).

### Error responses

`new Response(422, headers, body)` becomes a `status` option on the mock. The response function
returns the error document, and `invalidBody` is the exact string the app sends for the invalid
record.

```js
await POST(this, 'api/posts', () => ({
  errors: [{ status: '422', title: 'Title is invalid', source: { pointer: '/data/attributes/title' } }],
}), { status: 422, body: invalidBody });
```

A Mirage handler that branched between success and error becomes two tests, one per branch.

Replay sends an empty body for any status of 500 or above, so a converted `new Response(500, …)`
test that reads the error body passes while recording and fails in CI. Assert on the status alone
for those.

### Asserting that a request was made

Tests that read `server.pretender.handledRequests` do not need a request log. A request with no
declared mock fails with `MOCK_NOT_FOUND`, and a declared mock that is never requested fails the
test from `afterEach`. To assert that a request happens, declare exactly that mock. To assert that
no extra request happens, declare none.

To check the order of requests, add a handler ahead of `MockServerHandler` that records each one
with `assert.step`.

```ts
import { Fetch, RequestManager } from '@warp-drive/core';
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';
import { MockServerHandler } from '@warp-drive/holodeck';

class Logger implements Handler {
  constructor(public assert: Assert) {}
  request<T>(context: RequestContext, next: NextFn<T>) {
    this.assert.step(`request: ${context.request.method ?? 'GET'} ${context.request.url}`);
    return next(context.request);
  }
}

const manager = new RequestManager().use([new Logger(assert), new MockServerHandler(this), Fetch]);
```

The logger runs before Holodeck appends its test id to the URL, so `assert.verifySteps` sees the URL
the app built. This needs a `RequestManager` chain. Requests from legacy adapters do not pass through
one, so rely on the mock accounting there.

### The same endpoint twice in one test

A Mirage test that posted a record and then listed it relied on the database to connect the two
requests. In Holodeck, declare each response. Holodeck numbers requests per method and URL, so the
first `GET` mock answers the first `GET` to that URL and the second mock answers the second.

```js
const created = { type: 'posts', id: '7', attributes: { title: 'Second draft' } };

await GET(this, 'api/posts', () => ({ data: [] }));
await POST(this, 'api/posts', () => ({ data: created }), { body });
await GET(this, 'api/posts', () => ({ data: [created] }));
```

`body` is the serialized record, built as in [A POST with a body](#a-post-with-a-body).

The same approach replaces a `requestCount` counter in a reload test. Declare the URL twice, with a
different response each time. See
[Mock the same URL more than once](/guides/the-manual/testing/writing-mocks.md#mock-the-same-url-more-than-once).

### Legacy adapters

Requests from `@warp-drive/legacy` adapters, such as `store.findRecord` and `record.save()`, skip
the request chain. An app whose build does not yet call ***Warp*Drive**'s `setConfig`, such as a
classic ember-cli app on an older Ember Data, needs it because Holodeck's browser build reads its
build-time flags. Add it to `ember-cli-build.js` after `new EmberApp(...)`.

```js
// add @warp-drive/build-config to devDependencies so this require resolves
const { setConfig } = require('@warp-drive/build-config/cjs-set-config.cjs');
setConfig(app, __dirname, {});
```

Without it, the test build fails with
`TypeError: .../holodeck/dist/index.js: Cannot read properties of undefined (reading 'env')`. Then
patch the store in each module that makes requests.

```js
import { installAdapterFor } from '@warp-drive/holodeck';

hooks.beforeEach(function () {
  installAdapterFor(this, this.owner.lookup('service:store'));
});
```

Holodeck does not rewrite the adapter's host, so set your adapters' `host` to the mock server's
origin in the test environment. Declare the path the adapter builds, namespace included. A REST
or ActiveModel payload is not JSON:API, so you can pass
`headers: { 'Content-Type': 'application/json' }` on those mocks to keep the recorded response
honest. The adapter parses the body as JSON either way. See [With legacy adapters](/guides/the-manual/testing/client-setup.md#with-legacy-adapters).

## What has no equivalent

Each item below is a Mirage feature with no Holodeck counterpart, and what to do instead.

* The database, `schema`, and the models discovered from your Ember Data models. Nothing on the
  Holodeck side stores state. Write the documents each test needs.
* Factories with traits, `association()`, and `afterCreate`. Write one builder that returns
  `{ data, included }` for the whole graph, with fixed ids, and use the same ids in URLs and
  assertions.
* Serializers. You write the wire format yourself. Logic that lived in a serializer, such as
  pagination `meta`, goes into each response.
* Scenarios. Replace `defaultScenario(this.server)` with the requests the page under test makes.
  Through `MockServerHandler`, each request without a mock fails with a message that names its
  URL, so the failures list what to declare next. On the legacy adapter path, read the browser's
  network panel instead. A helper that declares the requests a page always makes can be shared
  across tests, as long as every test that calls it makes all of those requests, because an
  unused mock fails the test.
* `passthrough`. It is not needed. Holodeck only sees requests that its handler decorated, and
  every other request goes where it always went.
* `timing`. Holodeck has no delay option. Mirage already set timing to zero in tests.

A store-backed mock that runs like a program, closer to Mirage's model, is proposed in the
HoloPrograms RFC ([#11205](https://github.com/warp-drive-data/warp-drive/pull/11205)). That
proposal is under review and is not part of Holodeck today.

## Migrating a whole suite

Convert one module at a time. Mirage and Holodeck run in the same suite, because Mirage starts its
server from `setupMirage(hooks)` in `beforeEach` and a module that no longer calls `setupMirage`
gets no Mirage server. If `ENV['ember-cli-mirage'].autostart` is set, Mirage starts for every test whether or not the
module calls `setupMirage`, so turn it off for the test environment first. If app code depends on
something Mirage installs when its server starts, such as a development login, replace that
property in the converted module's `beforeEach`.

Let Mirage tell you what each test requests before you convert it. Set `trackRequests: true` in
the server config, or wrap `this.server.pretender.handledRequest` in the test, and print every
request's method, URL, request body, and response body at the end of the test, in order. That list
is the set of mocks to declare, with the bodies to copy, so the converted test records on its
first run instead of failing once per missing mock.

Work in this order.

1. Store and adapter tests. They assert on URLs, query parameters, and bodies, which Holodeck's
   exact matching expresses directly.
2. Component tests. These often need the direct `fetch` calls from
   [Before you start](#before-you-start) moved onto the `RequestManager` first.
3. Acceptance tests. A page load fans out into many requests that no test ever listed. Declare
   each one, or delete tests that only prove a page renders.

Set `ENV['ember-cli-mirage'].enabled` to `false` for the test environment once no module calls
`setupMirage`. If Mirage also serves your app under `ember serve`, leave it enabled for
development. Once nothing uses Mirage, uninstall `ember-cli-mirage` and `miragejs`, delete the
`mirage/` directory, and remove the `ENV['ember-cli-mirage']` settings. After the
uninstall, check whether your app imports `ember-inflector` directly. ember-cli-mirage depends on
it, so the import may have resolved through Mirage until now. Add it to your own dependencies if
you import it.

Commit the fixtures with every converted test. CI sets `CI`, so it replays, and a test whose
fixture is missing fails there even though it passed on your machine. Renaming a module or a test
changes its test id, which leaves the old fixture directory behind. See
[What lands on disk](/guides/the-manual/testing/record-and-replay.md#what-lands-on-disk).

## Frequent issues

### `No meta was found` (`MOCK_NOT_FOUND`) for a request you mocked

The mock and the request are not the same string. After a migration, the usual causes are a
missing namespace, query parameters in a different order, and a `body` that differs from the
serialized record. See
[A mocked request failed with a 400](/guides/the-manual/testing/troubleshooting.md#a-mocked-request-failed-with-a-400).

### `this test declared mocks it never requested`

A route copied from `mirage/config.js` that this test never hits. Delete the mock. See
[The test declared a mock it never requested](/guides/the-manual/testing/troubleshooting.md#the-test-declared-a-mock-it-never-requested).

### `MISSING_X_TEST_ID_HEADER`

The request did not go through `MockServerHandler` or a patched adapter. Look for code that calls
`fetch` directly. See
[The request never reached the handler](/guides/the-manual/testing/troubleshooting.md#the-request-never-reached-the-handler).

### `MockServerHandler is not configured with a testId`

The global hooks are missing, or a test uses an arrow function, so `this` is not the test context.
See [The test id is missing](/guides/the-manual/testing/troubleshooting.md#the-test-id-is-missing).

### The test passes locally and fails in CI

The fixture was recorded but not committed. Commit `.mock-cache`, and run in replay mode before you
push. See [Commit the fixtures](/guides/the-manual/testing/record-and-replay.md#commit-the-fixtures).

### `GET is not a function`

The test imported the helper from `@warp-drive/holodeck`, and the error reads
`TypeError: (0 , _holodeck.GET) is not a function`. Import `GET`, `POST`, and the other helpers from
`@warp-drive/holodeck/mock`.

### `TypeError: Failed to fetch` from a legacy adapter

The request sent a header that the mock server's CORS preflight rejects. The server allows only the
`Accept` and `Content-Type` request headers, so an adapter that sends `Authorization: Bearer ...`
fails in the browser. The test id itself travels as a query parameter, so it passes the preflight.
Return no `Authorization` header from the adapter when `TESTING` from
`@warp-drive/core/build-config/env` is true, or wrap the adapter's request in your test helper to
delete the header before `installAdapterFor` wraps it. On this path a missing fixture arrives as a
plain 400 adapter error without the `MOCK_NOT_FOUND` explanation, because only `MockServerHandler`
adds it. Read the response body in the network panel.

### `Invalid response status code 204`

A `DELETE` mock that returns nothing records a `204`, and replay fails because the server builds
the replayed response with an empty string body, which a `204` may not carry. Until that is fixed,
mock the delete with `{ status: 200 }` and a small body such as `() => ({ meta: {} })`. The
adapter accepts either.

### `EADDRINUSE: address already in use`

Holodeck binds one fixed port and never falls back to another, so a second Holodeck on the same
port fails. Stop the other process, or give each suite its own port. See
[The port was taken](/guides/the-manual/testing/troubleshooting.md#the-port-was-taken).
