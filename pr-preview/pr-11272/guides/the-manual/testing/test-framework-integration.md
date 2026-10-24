---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/guides/the-manual/testing/test-framework-integration.md
---

# Test framework integration

Holodeck needs two things from your test framework. A stable id for each test, and the address of
the mock server.

## Give each test an id

As part of running tests concurrently, holodeck scopes requests to individual test contexts. Two
tests making the same request get their own responses, and neither leaks into the other. The id is
also what names the fixture directory on disk.

Register it in a global `beforeEach`, and clear it afterwards.

### With Diagnostic

```ts
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { setTestId } from '@warp-drive/holodeck';

setupGlobalHooks((hooks) => {
  hooks.beforeEach(function (assert) {
    setTestId(this, (assert as unknown as { test: { testId: string } }).test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});
```

The cast is required today. `Diagnostic` does not expose `test` on its public type, and the line
does not compile without it.

### With QUnit

```ts
import { setTestId } from '@warp-drive/holodeck';

QUnit.hooks.beforeEach(function (assert) {
  setTestId(this, assert.test.testId);
});
QUnit.hooks.afterEach(function () {
  setTestId(this, null);
});
```

Use `function` hooks rather than arrow functions in both cases. Holodeck stores the id against the
object you pass, and that object has to be the test context your tests and your
[request handler](./client-setup.md) also see.

:::tip Where this goes
For QUnit and Diagnostic in an Ember project this is usually `tests/test-helper.js`. In a Vite
project it is whichever module boots the suite, often `start.ts`.
:::

## Point requests at the mock server

The mock server runs on its own port, so both ***Warp*Drive** and holodeck have to be told where it
is. These are two calls from two packages, and they do different jobs.

```ts
import { setConfig } from '@warp-drive/holodeck';
import { setBuildURLConfig } from '@warp-drive/utilities';

const MockHost = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;

setBuildURLConfig({ host: MockHost, namespace: '' });
setConfig({ host: MockHost });
```

`setBuildURLConfig` aims the requests your application makes. `setConfig` aims only the internal
request that records a fixture. Setting the second without the first records fixtures that no
request ever reads, and the tests fail as though the mocks were never declared.

The `+ 1` mirrors the port given to the server in [server setup](./server-setup.md). To serve the
mock from the test page's own origin instead, set `MockHost` to `''` and forward its requests as
[Common setups](./common-setups/index.md) shows.

## Related

* [Server setup](./server-setup.md) starts the server on the port this page computes.
* [Client setup](./client-setup.md) installs the handler that reads the test id.
