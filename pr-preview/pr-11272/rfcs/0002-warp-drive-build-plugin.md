---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/rfcs/0002-warp-drive-build-plugin.md
description: >-
  Proposes a framework-agnostic `@warp-drive/core/build-plugin` bundler plugin
  that replaces the babel and @embroider/macros build configuration for
  WarpDrive.
---

# A Framework-Agnostic Build Plugin for WarpDrive&#x20;

## Summary

WarpDrive (EmberData) gains a first-class bundler plugin, imported from
`@warp-drive/core/build-plugin`, that replaces its current babel-based build configuration.
One plugin works in Vite, Rollup, Rolldown, Webpack, Rspack, and esbuild, serving Ember,
React, Vue, Svelte, and Angular apps. It removes `@embroider/macros` and babel from
WarpDrive's app-facing build path, reduces setup to one line of bundler config, and
guarantees a single shared configuration no matter how many copies of WarpDrive packages
exist in an app's dependency tree. The existing `setConfig` options are accepted unchanged;
the babel path is deprecated on a staged timeline and removed in a future major.

## Motivation

WarpDrive instruments its source with build-time flags: deprecation stripping keyed on
`compatWith`, canary feature flags, dev-only assertions, and toggleable debug logging. Today,
applying an app's configuration to those flags requires a babel pipeline: `setConfig()` feeds
`@embroider/macros`, and the app's babel config must include the embroider macros plugins,
`babel-plugin-debug-macros`, and (for app-side flag use) WarpDrive's own transform set. Four
problems motivate replacing this:

**1. Supporting more frameworks.** WarpDrive now ships bindings for React, Vue, and Svelte
alongside Ember. Those ecosystems do not have babel in their default toolchains — Vite uses
esbuild/oxc, Angular uses its own compiler. Today a React app must disable its native
transforms and adopt babel *solely to configure WarpDrive*. A bundler plugin meets every
framework where it already is.

**2. Simplifying configuration overall.** The current Ember setup threads one config object
through several coupled pieces: `buildMacros({ configure: ... })`, `setConfig()`,
`...macros()`, `...Macros.babelMacros`, and a `babel-plugin-debug-macros` entry — each a
chance to wire something in the wrong order or miss a piece entirely (the widely-copied
"Simple Config" recipe silently omits the transforms that compile app-side flag imports).
The replacement is a single plugin call carrying the same options object.

**3. Avoiding a forced babel pass.** Requiring babel is a real cost even where babel exists:
every file WarpDrive ships must flow through the app's babel pipeline in `node_modules`, and
apps must maintain marker-based include lists to make that happen. The plugin transforms only
the files that need it, using a native-speed parser, with no babel dependency.

**4. Avoiding collisions with `@embroider/macros`.** When an app's dependency tree
accidentally contains more than one copy of `@embroider/macros`, each copy holds its own
config store — under `buildMacros()` the copies never coordinate — so WarpDrive's config can
silently fail to reach the copy compiling its files, producing wrong or missing stripping
with no error. The plugin owns its own coordination (detailed below) and, by consuming
WarpDrive's macros itself before babel runs, removes WarpDrive from embroider's blast radius
entirely — while leaving other addons' embroider usage untouched.

The expected outcome: every supported framework configures WarpDrive with one plugin line;
Ember apps keep their existing options unchanged; the config-collision failure mode becomes
impossible or loud; and `@embroider/macros` plus babel leave WarpDrive's dependency graph on
a published timeline.

## Detailed design

### The plugin

The implementation lives in `@warp-drive/build-config` (the package that already owns
`setConfig` and the flag definitions) and is re-exported as `@warp-drive/core/build-plugin`.
It is **one plugin**, built on [unplugin](https://unplugin.unjs.io): a single instance whose
per-bundler adapters are property accesses, so there is one import path for every bundler and
no per-framework plugin packages.

```js
import { warpDrive } from '@warp-drive/core/build-plugin';

warpDrive.vite(options);     // Vite (Ember via embroider, React, Vue, Svelte, SolidStart, Astro, Nuxt)
warpDrive.webpack(options);  // Webpack (Next.js, Angular's legacy builder)
warpDrive.esbuild(options);  // esbuild (Angular's current builder, via custom-esbuild)
warpDrive.rollup(options);   // also .rolldown(), .rspack(), .rsbuild()
```

The options are the same `WarpDriveConfig` object `setConfig` accepts today — `compatWith`,
`deprecations`, `features`, `debug`, `polyfillUUID`, `includeDataAdapterInProduction` — with
identical semantics and identical environment-variable handling (`EMBER_ENV`, `NODE_ENV`,
`IS_TESTING`, `WARP_DRIVE_FEATURE_OVERRIDE`, and friends). No option is renamed. The plugin
and `setConfig` share one implementation of config resolution, so they cannot drift.

### Using the new API

**Ember (embroider + Vite):**

```js
// vite.config.mjs
import { ember, extensions } from '@embroider/vite';
import { warpDrive } from '@warp-drive/core/build-plugin';

export default {
  plugins: [
    ...ember(),
    warpDrive.vite({ compatWith: '5.7' }),
  ],
};
```

WarpDrive-related entries in `babel.config.mjs` are no longer needed (see Migration). Babel
remains for Ember's own needs — decorators, templates — untouched.

**Ember (classic ember-cli): no change.** `setConfig(app, __dirname, config)` in
`ember-cli-build.js` remains the entire user surface, in 5.x via today's pipeline and after
the transition via a WarpDrive-provided babel bridge that the addon wires up automatically.

**React (plain Vite)** — shown to make the framework-agnostic claim concrete:

```js
// vite.config.mjs
import react from '@vitejs/plugin-react';
import { warpDrive } from '@warp-drive/core/build-plugin';

export default {
  plugins: [react(), warpDrive.vite({ compatWith: '5.7' })],
};
// No babel config. No esbuild:false workaround. WarpDrive was the only reason either existed.
```

**Using flags in your own app code** works with zero additional configuration. The same
booleans WarpDrive's source uses are available to apps, compiled by the same plugin:

```ts
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

if (DEBUG) {
  // stripped from production builds
}
assert('expected a store', isStore(candidate)); // stripped from production builds
```

The plugin recognizes these by their import specifiers — which are WarpDrive-owned module
names — so it cannot affect any other import in app code.

### What the plugin does

Three transforms, applied only to files that import the relevant modules (a cheap
string-marker filter, evaluated natively by the bundler where supported, skips everything
else):

1. **Published WarpDrive packages.** WarpDrive's published code carries its flags as
   `@embroider/macros` expressions (`macroCondition(getGlobalConfig().WarpDrive...)`). The
   plugin evaluates these against the app's config and prunes dead branches — the same
   stripping the embroider babel plugin performs today, from the same config values. This
   works against already-published versions: no library upgrade is required to adopt the
   plugin.
   Scoping is by the owning package's `package.json` name (`@warp-drive/*`, `@ember-data/*`,
   `ember-data`), so embroider macros in any other package are never touched.
2. **Flag imports in app code** (the example above), replaced with constant values; dead
   branches are removed in production by the plugin or the app's minifier.
3. **`deprecate`/`warn` from `@ember/debug`** inside WarpDrive's published files — the job
   `babel-plugin-debug-macros` does today. In Ember apps these are left untouched so
   `registerDeprecationHandler` and `expectDeprecation` keep working; in non-Ember apps they
   are backed by a console shim in development and stripped in production.

Runtime-toggleable debug logging is preserved exactly: in dev and test builds, logging
branches remain and are gated at runtime, so `setWarpDriveLogging({ LOG_REQUESTS: true })`
in the console keeps working without a rebuild; in production builds unconfigured logging
compiles to zero bytes.

In a later major (see the schedule under "Deprecating the old API"), WarpDrive's published
output stops carrying
`@embroider/macros` expressions at all, switching to plain flag imports with working runtime
defaults — at which point a build with no plugin configured still runs correctly (as an
unoptimized development-flavored build that logs a one-time warning), and `@embroider/macros`
leaves WarpDrive's dependencies.

### One config, no matter how many copies

A real dependency tree can contain several copies of the plugin's own package and many copies
of WarpDrive libraries, across bundler worker threads and processes. The design guarantees
they all apply one configuration:

* **Within a process**, every copy converges on a single registry stored on `globalThis`
  under `Symbol.for('warp-drive.build-store')` — a key that is identical across all copies
  and versions. (Embroider's equivalent handshake is keyed by object identity, which
  independently-created instances never share; that is the root of today's duplicate-copy
  failure.) The registry holds only plain JSON data with an explicit protocol version, so
  version-skewed copies interoperate or fail loudly, never silently.

* **Registering the same config twice is the normal case** (that is how copies converge).
  Registering a *different* config is a build error that names both sources and the first
  differing keys:

  ```
  [WarpDrive::build] Conflicting WarpDrive build configs for app '/srv/app'.
    First set from ember-cli-build.js via setConfig() with compatWith: '4.12';
    then from vite.config.mjs via warpDrive.vite() with compatWith: '5.6'.
  WarpDrive config must be identical everywhere it is declared.
  Differing keys: compatWith, deprecations.DEPRECATE_TRACKING_PACKAGE.
  ```

* **Across threads and processes**, which share no `globalThis`, the guarantee is
  determinism: the resolved config is a pure function of the plugin options and environment
  variables, so every worker that evaluates the same bundler config derives the same result.
  Where config travels as data (loader options), it carries a hash that the receiving side
  verifies, turning environment drift into a diagnosable error instead of divergent output.

* **Library copies need no coordination at build time** — they are inert files, each
  transformed with the same config regardless of which physical copy it is.

### Coexistence with `@embroider/macros`

During migration, an app may have both the plugin and an embroider babel pass wired. This is
safe in both orders:

* The plugin runs ahead of babel (`enforce: 'pre'`). After it transforms a WarpDrive file, no
  `@embroider/macros` imports remain in it. The embroider babel plugin scopes all of its work
  to references of those imports, so it provably no-ops on the plugin's output — and
  continues to process every *other* package's macros exactly as before.
* If a misconfigured pipeline runs embroider first, `setConfig` (which now also feeds the
  plugin's registry, and continues to feed embroider's) ensures embroider inlines the same
  values the plugin would have; the plugin then finds nothing left to do.

This ordering property is also the migration mechanism: **adopting the plugin is an
insertion, not a swap.** Adding the plugin immediately takes over WarpDrive's files; removing
the old babel entries becomes optional cleanup rather than a coordinated step.

### Migrating

**Before** (Ember, embroider + Vite):

```js
// babel.config.mjs
import { buildMacros } from '@embroider/macros/babel';
import { setConfig } from '@warp-drive/core/build-config';
import { macros } from '@warp-drive/core/build-config/babel-macros';

const Macros = buildMacros({
  configure: (config) => {
    setConfig(config, { compatWith: '5.7' });
  },
});

export default {
  plugins: [
    ...macros(),
    ['babel-plugin-debug-macros', { /* ... */ }, 'ember-data-macros'],
    ...Macros.babelMacros,
    // ...decorators, templates, etc.
  ],
};
```

**After:**

```js
// vite.config.mjs — one added line
import { ember, extensions } from '@embroider/vite';
import { warpDrive } from '@warp-drive/core/build-plugin';
export default {
  plugins: [...ember(), warpDrive.vite({ compatWith: '5.7' })],
};

// babel.config.mjs — WarpDrive entries deleted; only decorators/templates remain.
// If other addons in the app use @embroider/macros, keep buildMacros for them;
// it will no longer process WarpDrive's files either way.
```

The options object moves verbatim from `setConfig` to the plugin call. Apps that keep both
temporarily get identical output (same config, either order) or a loud conflict error if the
two ever disagree — never silent divergence.

Classic ember-cli apps migrate by doing nothing: `setConfig(app, __dirname, config)` is
unchanged.

### Deprecating the old API

The babel path — `babelPlugin()`, `buildMacros()` + `setConfig()` wiring, `macros()`, and the
`babel-plugin-debug-macros` entry — is deprecated on this schedule (the 3-arg classic
`setConfig(app, __dirname, config)` form is *not* deprecated; it becomes classic Ember's way
of passing options to the plugin):

1. **Next 5.x minor:** plugin ships; docs recommend it everywhere except classic ember-cli.
   The babel path is fully supported and prints nothing.

2. **Following 5.x minor:** the babel path prints a one-time build notice (info level, not a
   deprecation) pointing at the migration guide.

3. **Next major (6.0):** the babel path issues a formal build-time deprecation:

   ```
   DEPRECATION [warp-drive.legacy-babel-config]: Configuring WarpDrive through babel
   (babelPlugin(), buildMacros() + setConfig(), macros(), or babel-plugin-debug-macros)
   is deprecated. Add the WarpDrive build plugin to your bundler config instead — it
   replaces all of these entries and accepts the same options:

     // vite.config.mjs
     import { warpDrive } from '@warp-drive/core/build-plugin';
     plugins: [...ember(), warpDrive.vite({ compatWith: '5.7' })]

   Then remove the WarpDrive entries from your babel config.
   Migration guide: https://docs.warp-drive.io/guides/build-plugin-migration
   [deprecation id: warp-drive.legacy-babel-config, since: 6.0, until: 7.0]
   ```

4. **Following major (7.0):** the babel path is removed. A babel *bridge* plugin (wrapping
   the same transform core, no embroider involved) remains available indefinitely for
   pipelines that genuinely only have babel.

Also at 6.0, WarpDrive's published output switches to the plain-flag format and
`@embroider/macros` is removed from every WarpDrive package's dependencies — ending the
duplicate-copy hazard for Ember apps at the root.

### Ecosystem implications

* **Addons** consuming WarpDrive flags in their own code get compiled by the app's plugin the
  same way app code does; addons that use `@embroider/macros` for their own purposes are
  unaffected.
* **Ember Inspector / debuggability:** unchanged; `includeDataAdapterInProduction` and the
  runtime logging toggles behave identically.
* **Engines / SSR / FastBoot:** the plugin is build-time only; output semantics match the
  current pipeline.
* **Blueprints:** the app blueprint's WarpDrive/EmberData wiring updates to the plugin recipe.
* **Lint rules:** none required.
* **IDE support:** flag imports are real modules with real types; nothing changes.

## How we teach this

Teach it as "the WarpDrive build plugin" — a continuation of the existing concept that
WarpDrive has build configuration, relocated from babel to the bundler. The guides'
setup page reduces from three paradigm-dependent recipes to one line per bundler, with
classic ember-cli documented as "no change." The `WarpDriveConfig` options reference is
already written and applies as-is.

For existing users, the migration guide is the before/after shown above plus one rule of
thumb: *put the plugin ahead of babel; delete the babel entries when convenient.* For new
users, the plugin recipe is strictly simpler than what it replaces, and non-Ember framework
docs no longer need to explain babel at all.

## Drawbacks

* **Install weight:** the plugin adds `unplugin` and `oxc-parser` (a native-binary parser
  with wasm fallback) to `@warp-drive/build-config`'s dependencies, which every consumer
  installs transitively. These are node-only, never bundled, and deduped, but they are real
  bytes and CI surface.
* **Two supported paths during the transition** (plugin and babel) means dual documentation
  and dual testing until 7.0.
* **Weak hosts have caveats:** esbuild's plugin model limits coexistence with other
  transform plugins (relevant to Angular's builder), and Turbopack supports only a
  loader-shaped bridge with user-maintained file globs. Both degrade to correct-but-
  unoptimized behavior rather than breakage, but the support tiers must be documented
  honestly.
* **Reimplementation risk:** the plugin evaluates the macro expressions WarpDrive publishes,
  a job embroider's babel plugin does today. The expression grammar is closed and small
  (WarpDrive's own publish step is its only author), and it is locked down by golden tests
  against real published artifacts, but it is code WarpDrive now owns.

## Alternatives

* **Stay on `@embroider/macros` + babel.** Rejected: it makes babel a hard requirement in
  ecosystems that have moved off it, and the duplicate-copy config hazard is structural.
* **Ship a babel plugin instead of a bundler plugin.** Simpler to build, but fails the
  primary motivation — non-babel toolchains — and keeps WarpDrive's files flowing through
  app babel pipelines.
* **Per-framework plugin packages** (`@warp-drive/vite-plugin`, etc.). Rejected: unplugin
  provides all per-bundler adapters from one implementation; separate packages would
  multiply the version-skew and duplicate-copy surface this RFC works to eliminate.
* **A new standalone package for the plugin.** Rejected in favor of housing it in
  `@warp-drive/build-config` (re-exported from `@warp-drive/core`): the plugin lives beside
  the config code it shares, and consumers need no new dependency.
* **Do nothing for non-Ember frameworks** and document babel workarounds. Rejected: the
  workarounds (disabling native TS/JSX transforms to insert babel) are the worst part of the
  current non-Ember experience.

## Unresolved questions

* The classic ember-cli story at 6.0 relies on the addon automatically injecting the babel
  bridge into the app's babel options; this is gated behind a flag for the full 6.0 beta
  cycle, with a documented manual fallback if it proves unreliable across ember-cli-babel
  versions and engines setups.
* Default flag values for builds that never ran the plugin (post-6.0): lenient
  test-friendly defaults keep runtime log toggling alive but relax a duplicate-copy runtime
  guard; strict defaults invert the trade.
* Whether `@warp-drive/core/build-plugin` should also be exposed under the `ember-data`
  package name for apps that consume WarpDrive exclusively through it.
