---
url: >-
  https://canary.warp-drive.io/skills/contributors/extract-test-setup-into-functions.md
---
# Extract Test Setup Into Functions

Use this skill whenever you're writing or reviewing a test in this repo's `tests/*` test apps and
you're about to share setup or teardown across more than one `test()` in the same
`module(name, function (hooks) {...})` block.

## Steps

1. Don't register shared setup with `hooks.beforeEach`, and don't register shared teardown with
   `hooks.afterEach`. Both run unconditionally for every `test()` in the module, so a test that
   doesn't need that setup still pays for it — often a full `Store` with schemas and request
   handlers.

2. Write a plain function instead (module-scoped, or shared across files via its own module) and
   have each test that actually needs the setup call it explicitly, at the top of the test body:

   ```ts
   function setupStore() {
     const store = new Store();
     store.schema.registerResources([UserSchema]);
     return store;
   }

   module('widget updates', function () {
     test('creates a widget', function (assert) {
       const store = setupStore();
       assert.ok(store);
     });

     test('is unaffected by widget creation', function (assert) {
       // never calls setupStore() — pays nothing for it
       assert.ok(true);
     });
   });
   ```

3. If every single test in the module genuinely needs the same setup with no variation, a
   `beforeEach` isn't "wasteful" in the sense this skill cares about — but an extracted function
   called from each test still keeps the option open for a later test that doesn't need it,
   without a rewrite. Prefer the function either way.

4. `setupTest(hooks)`/`setupRenderingTest(hooks)` themselves are fine to keep — they're a single
   call, not a `hooks.beforeEach`/`hooks.afterEach` registration, and they wire up the test
   framework's owner rather than any test-specific state.

5. `eslint-plugin-warp-drive`'s `no-test-module-hooks` rule (part of its `recommended-internal`
   ruleset) flags `hooks.beforeEach`/`hooks.afterEach` for exactly this reason. It runs as an
   error in `tests/core`'s lint config; other, older test apps still have pre-existing hooks it
   hasn't been safe to flip to an error for yet, so it runs there as a warning instead while they
   get migrated incrementally. Don't add new `hooks.beforeEach`/`hooks.afterEach` usage to any of
   them, warning or not.

## Why

A test suite this large runs its setup cost multiplied by however many tests share it. A
`beforeEach` that builds a `Store`, registers schemas, and wires up request handlers runs that
full cost before every single test in the module — including ones that only need a fraction of
it, or none of it. An extracted function only runs, and only costs anything, for the tests that
call it.
