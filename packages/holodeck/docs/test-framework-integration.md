# Test Framework Integration

You will need to configure holodeck to understand your test context and port.

> [!TIP]
> For qunit and diagnostic in a project using Ember this is typically done in `tests/test-helper.js`

## setTestId

As part of its strategy for enabling fast test suites, Holodeck utilizes a real http server and scopes requests to individual test contexts.

This allows tests to run concurrently even when they make similar or identical requests without leaking state between.

To do this, we give holodeck a unique stable testId for each test context. Below we show how to achieve
this with several common test frameworks.

### With QUnit

```ts
QUnit.hooks.beforeEach(function (assert) {
  setTestId(this, assert.test.testId);
});
QUnit.hooks.afterEach(function (assert) {
  setTestId(this, null);
});
```

### With Diagnostic

```ts
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { setTestId } from '@warp-drive/holodeck';

setupGlobalHooks((hooks) => {
  hooks.beforeEach(function (assert) {
    setTestId(this, assert.test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});
```

## setConfig

If our holodeck server is not running on the same host and port as our application we need to tell it where to direct requests to.

```ts
import { setConfig } from '@warp-drive/holodeck';

// if not proxying the port / set port to the correct value here. For instance if we always run our tests on port N and holodeck on port N +1 we could do that like below.
const MockHost = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;

setConfig({ host: MockHost });
```
