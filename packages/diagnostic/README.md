<p align="center">
  <img
    class="project-logo"
    src="./NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">⚡️ A Lightweight Modern Test Runner</h3>
<p align="center">QUnit Compatible (mostly! 🙈)</p>

> ⚠️ Private

This package may currently only be used within EmberData. A public version is coming soon 💜

```cli
pnpm install @warp-drive/diagnostic
```

**@warp-drive/** *diagnostic* is a ground-up revisiting of the APIs [QUnit](https://qunitjs.com/) popularized and [Ember](https://github.com/emberjs/ember-qunit) polished.

- 💜 Fully Typed
- :electron: Universal
- ⚡️ Fast
- ✅ Easy to use

**@warp-drive/** *diagnostic* is ***also*** a test launcher/runner inspired by the likes of [Testem](https://github.com/testem/testem), [ember exam](https://github.com/ember-cli/ember-exam) and the [ember test](https://cli.emberjs.com/release/basic-use/cli-commands/#testingyourapp) command. It is similarly flexible, but faster and more lightweight while somehow bringing a more robust feature set to the table.

- 🚀 Easy Browser Setup Included
- :octocat: Runs without fuss on Github Actions
- 📦 Out of the box randomization, parallelization, load balancing, and more.

But don't worry, if you're not ready to leave your existing stack the launcher/runner portion is optional. Out of the box, it comes ready with a [Testem](https://github.com/testem/testem) integration,
or you can add your own.

## Quickstart

- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Using the DOM Reporter](#using-the-domreporter)
- [Concurrency](#concurrency)
- [Using The Launcher](#using-the-launcher)
- [Adding A Sidecar](#adding-a-sidecar)
- [🔜 Parallelism](#parallelism)
- [🔜 Randomization](#randomization)
- [Why Is It Fast?](#why-is-it-fast)
- [Migration From QUnit](#migration-from-qunit)
- [Using with Ember](#using-with-ember)

---

### Writing Tests

```ts
import { module, test } from '@warp-drive/diagnostic';

module('My Module', function(hooks) {
  hooks.beforeEach(async function() {
    // do setup
  });

  test('It Works!', async function(assert) {
    assert.ok('We are up and running');
  });
});
```

Tests and hooks may be async or sync.

The `this` context and `assert` instance passed to a `beforeEach` or `afterEach` hook is the same as will be used for the given test but is not shared across tests.

This makes `this` a convenient pattern for accessing or stashing state during setup/teardown in a manner that is safe for *test concurrency*.

Global and module level state that is not safely shared between multiple tests potentially running simultaneously should be avoided.

When augmenting `this`, import `TestContext`.

```ts
import { type TestContext } from '@warp-drive/diagnostic';

interface ModuleContext extends TestContext {
  some: 'state';
}

module('My Module', function(hooks) {
  hooks.beforeEach(async function(this: ModuleContext) {
    this.some = 'state';
  });

  test('It Works!', async function(this: ModuleContext, assert) {
    assert.equal(this.some, 'state', 'We are up and running');
  });
});
```

Alternatively, key some state to a WeakMap and avoid the
type gymnastics.

```ts
interface ModuleState {
  some: 'state';
}
const STATES = new WeakMap<object, ModuleState>();

export function setState(key: object, state: ModuleState) {
  STATES.set(key, state);
}

export function getState(key: object) {
  const state = STATES.get(key);
  if (!state) {
    throw new Error(`Failed to setup state`);
  }
  return state;
}
```

Now all we need to do is use the `this` we already have!

```ts
import { setState, getState } from './helpers';

module('My Module', function(hooks) {
  hooks.beforeEach(async function() {
    setState(this, { some: 'state' });
  });

  test('It Works!', async function(assert) {
    const state = getState(this);
    assert.equal(state.some, 'state', 'We are up and running');
  });
});
```

---

### Running Tests

> **Note**
> This section is about how to setup your tests to run once launched. To learn about launching tests, read [Using The Launcher](#using-the-launcher)

> **Warning**
> This section is nuanced, read carefully!


To run your tests, import and run `start`.

```ts
import { start } from '@warp-drive/diagnostic';

start();
```

Start will immediately begin running any tests it knows about,
so when you call start matters.

For instance, if your tests require DOM to be setup, making sure `start` is called only once DOM exists is important.

If there are global hooks that need configured, that configuration needs to happen *before* you call `start`. Similar with any reporters, `registerReporter` must be called first.

```ts
import { registerReporter, setupGlobalHooks, start } from '@warp-drive/diagnostic';
import CustomReporter from './my-custom-reporter';

setupGlobalHooks((hooks) => {
  hooks.beforeEach(() => {
    // .. some setup
  });
  hooks.afterEach(() => {
    // .. some teardown
  });
});

registerReporter(new CustomReporter());

start();
```

---

### Using the DOMReporter

For convenience, a `DOMReporter` is provided. When using the `DOMReporter` it expects to be given an element to render the report into.

```ts
import { registerReporter, start } from '@warp-drive/diagnostic';
import { DOMReporter } from '@warp-drive/diagnostic/reporters/dom';

const container = document.getElementById('warp-drive__diagnostic');
registerReporter(new DOMReporter(container));

start();
```

When using this reporter you will likely want to include the `css` for it, which can be imported from `@warp-drive/diagnostic/dist/styles/dom-reporter.css`

The specific container element `id` of `warp-drive__diagnostic` only matters if using the provided dom-reporter CSS, custom CSS may be used.

For convenience, the above code can be condensed by using the DOM `runner`.

```ts
import { start } from '@warp-drive/diagnostic/runners/dom';

start();
```

---

### Concurrency

By default, diagnostic will only run tests one at a time, waiting for all `beforeEach` 
and `afterEach` hooks to be called for a test before moving on to the next. 

This is exactly as QUnit would have run the tests. For most this linear mode is
likely a requirement due to state having been stored in module scope or global scope.

But if you are starting fresh, or have a test suite and program that is very well encapsulated, you may benefit from using test concurrency.

Emphasis on *may* because concurrency will only help if there is significany empty time
during each test due to things such as `requestAnimationFrame`, `setTimeout` or a 
`fetch` request.

Concurrency is activated by providing a concurrency option in your test suite config. The option should be a positive integer
greater than `1` for it to have any effect.

```ts
import { configure, start } from '@warp-drive/diagnostic';

configure({
  concurrency: 10
});

start();
```

---

## Using The Launcher

#### Quick Setup

> Skip to [Advanced](#advanced-setup)

First, we need to add a configuration file for the launcher to our project.

If our build assets are located in `<dir>/dist-test/*` and the entry point for tests is `dist-test/tests/index.html`, then the default configuration will get us setup with no further effort.

*\<dir>/diagnostic.js*
```ts
import launch from '@warp-drive/diagnostic/server/default-setup.js';

await launch();
```

Next, adjust the configuration for `start` to tell the runner to emit test information to the diagnostic server.

```diff
start({
  groupLogs: false,
  instrument: true,
  hideReport: false,
+ useDiagnostic: true,
});
```

Next, we will want to install `bun`. (We intend to pre-bundle the runner as an executable in the near future, but until then this is required).

For github-actions, [use the official bun action](https://github.com/oven-sh/setup-bun#readme)

```yml
- uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest
```

Finally, give your tests a run to make sure they still work as expected.

```cli
bun ./diagnostic.js
```

And update any necessary scripts in `package.json`

```diff
{
  "scripts": {
     "build" "ember build",
-    "test": "ember test"
+    "test": "bun run build && bun ./diagnostic.js"
  }
}
```

✅ That's all! You're ready to test! 💜

---

#### Advanced Setup

---

### Adding A Sidecar

Diagnostic's launcher supports running additional services alongside your test suite
when they are necessary for your tests to run correctly. For instance, you may want
to start a local API instance, http mock service, or a build process.

#### Use with @warp-drive/holodeck

@warp-drive/holodeck is an http mock service for test suites. We can start and stop
the holodeck server along side our test server with an easy integration.

```ts

```

---

### Parallelism

[Coming Soon]

---

### Randomization

[Coming Soon]

---

### Why Is It Fast?

There's a number of micro-optimizations, but the primary difference is in "yielding".

`QUnit` and `ember-qunit` both schedule async checks using `setTimeout`. Even if no work needs to happen and the thread is free, `setTimeout` will delay `~4.5ms` before executing its callback.

When you delay in this manner multiple times per test, and have lots of tests, things add up.

In our experience working on EmberData, most of our tests, even our more complicated ones, had
completion times in the `4-30ms` range, the duration of which was dominated by free-time spent
waiting for `setTimeout` callbacks. We did some math and realized that most of our tests run in
less than `0.5ms`, and even our average was `<4ms`, smaller than the time for even a single `setTimeout`
callback.

`@warp-drive/diagnostic` runs tests as microtasks. Yielding out of the microtask queue only occurs if
the test itself needs to do so.

> **Note**
> soon we will elect to periodically yield just to allow the DOMReporter to show results, currently its so fast though that the tests are done before you'd care.

Next, diagnostic, uses several singleton patterns internally to keep allocations to a minimum while
running tests.

By not waiting for DOMComplete and by being more intelligent about yielding, we start running tests
sooner. In most situations this means test runs start 100-200ms quicker.

We further noticed that the qunit DOM Reporter was its own bottleneck for both memory and compute time. For our version we made a few tweaks to reduce this cost, which should especially help test suites with thousands or tens of thousands of tests.

Lastly, we noticed that the serialization and storage of objects being reported had a high cost.
This was a problem shared between the launcher (Testem) and what QUnit was providing to it. For this,
we opted to reduce the amount of information shared to Testem by default to the bare minimum, but with a fast `debug` toggle to switch into the more verbose mode.

---

### Migration from QUnit

1. Replace `qunit` with `@warp-drive/diagnostic`

```diff
index 2fbga6a55..c9537dd37 100644
--- a/package.json
+++ b/package.json
@@ -23,5 +23,5 @@
- "qunit": "2.20.0",
+ "@warp-drive/diagnostic": "latest",
```

2. Update imports from `qunit` to `@warp-drive/diagnostic`

```diff
--- a/tests/example.ts
+++ b/tests/example.ts
@@ -1,0 +1,0 @@
- import { module, test } from 'qunit';
+ import { module, test } from '@warp-drive/diagnostic';
```


3. Use `equal` and `notEqual`

Diagnostic has no loose comparison mode. So instead of `strictEqual` and `notStrictEqual` we can just use `equal` and `notEqual` which are already strict.

4. Update module hooks

`beforeEach` and `afterEach` are unchanged.
`before` and `after` become `beforeModule` and `afterModule`.

```diff
module('My Module', function(hooks) {
-  hooks.before(function(assert) {
+  hooks.beforeModule(function(assert) {
    // ...
  });

- hooks.after(function(assert) {
+ hooks.afterModule(function(assert) {
    // ...
  });
});
```

5. Update global hooks

`QUnit.begin` and `QUnit.done` become `onSuiteStart` and `onSuiteFinish` respectively.

`QUnit.hooks` becomes `setupGlobalHooks`.

```diff
+ import { setupGlobalHooks } from '@warp-drive/diagnostic';

- QUnit.begin(function() {});
- QUnit.done(function() {});
- QUnit.hooks.beforeEach(function() {});
+ setupGlobalHooks(function(hooks) {
+   hooks.onSuiteStart(function() {});
+   hooks.onSuiteFinish(function() {});
+   hooks.beforeEach(function() {});
+ });
```

---

### Using With Ember

1. Add the following peer-deps to your app:

```diff
+    "@ember/test-helpers": ">= 3.2.0",
+    "ember-cli-test-loader": ">= 3.1.0",
+    "@embroider/addon-shim": ">= 1.8.6"
```

2. Configure for ember in `test-helper.js`

```ts
import { configure } from '@warp-drive/diagnostic/ember';

configure();
```

3. Use setup helpers

```ts
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

module('My Module', function (hooks) {
  setupTest(hooks);
});
```

---

### ♥️ Credits

 <details>
   <summary>Brought to you with ♥️ love by <a href="https://emberjs.com" title="EmberJS">🐹 Ember</a></summary>

  <style type="text/css">
    img.project-logo {
       padding: 0 5em 1em 5em;
       width: 100px;
       border-bottom: 2px solid #0969da;
       margin: 0 auto;
       display: block;
     }
    details > summary {
      font-size: 1.1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details {
      font-size: 1rem;
    }
    details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #000;
      border-bottom: 3px solid #0969da;
    }

    details > details {
      margin-left: 2rem;
    }
    details > details > summary {
      font-size: 1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details > details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #555;
      border-bottom: 2px solid #555;
    }
    details > details {
      font-size: .85rem;
    }

    @media (prefers-color-scheme: dark) {
      details > summary strong {
        color: #fff;
      }
    }
    @media (prefers-color-scheme: dark) {
      details > details > summary strong {
        color: #afaba0;
      border-bottom: 2px solid #afaba0;
      }
    }
  </style>
</details>
