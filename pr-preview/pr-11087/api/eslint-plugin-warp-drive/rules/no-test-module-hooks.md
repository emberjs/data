---
url: >-
  /pr-preview/pr-11087/api/eslint-plugin-warp-drive/rules/no-test-module-hooks.md
---

| Rule | 🏷️ | ✨ |
| ---- | -- | -- |
| `no-test-module-hooks` | ⚡️ | |

> \[!NOTE]
> Flags `hooks.beforeEach`/`hooks.afterEach` calls in test modules. Every test in the module pays
> for that setup, even ones that don't need it.

## Examples

Before:

```js
module('mutation-request', function (hooks) {
  hooks.beforeEach(function () {
    this.store = useRecommendedStore({ handlers, cache, schemas });
  });

  test('creates a record', function (assert) {
    assert.ok(this.store);
  });

  test('is unaffected by the mutation', function (assert) {
    // this test never touches `this.store`, but still pays to build one
    assert.ok(true);
  });
});
```

After:

```js
function setupStore() {
  return useRecommendedStore({ handlers, cache, schemas });
}

module('mutation-request', function () {
  test('creates a record', function (assert) {
    const store = setupStore();
    assert.ok(store);
  });

  test('is unaffected by the mutation', function (assert) {
    assert.ok(true);
  });
});
```

## Why

A `hooks.beforeEach`/`hooks.afterEach` registered at the top of a module runs before/after *every*
test in that module, unconditionally. When only some tests need the setup it builds, the rest pay
its cost anyway — for WarpDrive's own suite this is often a full `Store` with schemas and request
handlers. An extracted setup function only runs for the tests that actually call it.

## Scope

* Matches calls on an identifier literally named `hooks`, the convention
  `@warp-drive/diagnostic`'s `module(name, function (hooks) {...})` callback uses. It does not
  trace imports or aliasing, so a differently-named hooks parameter isn't flagged, and an
  unrelated object literally named `hooks` would be.
* No autofix: deciding what state each test actually needs, and threading it through, isn't safe
  to automate.

## Variables

* [export=](variables/export=.md)
