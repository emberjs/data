---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/rfcs/0002-warp-drive-build-plugin.md
description: >-
  Proposes a framework-agnostic `@warp-drive/core/build-plugin` bundler plugin
  that replaces the babel and @embroider/macros build configuration for
  WarpDrive.
---

# A Framework-Agnostic Build Plugin for WarpDrive&#x20;

## Summary

WarpDrive (EmberData) gains a bundler plugin, imported from `@warp-drive/core/build-plugin`,
that replaces its babel-based build configuration. One plugin works in Vite, Rollup, Rolldown,
Webpack, Rspack, and esbuild, for Ember, React, Vue, Svelte, and Angular apps. Setup becomes one
line of bundler config, WarpDrive no longer needs `@embroider/macros` or babel in an app's build,
and every copy of WarpDrive in a dependency tree gets the same configuration. It accepts the
existing `setConfig` options unchanged. The babel path is deprecated on a staged timeline and
removed in a future major.

## Motivation

WarpDrive's source contains build-time flags: deprecation stripping keyed on `compatWith`,
canary feature flags, dev-only assertions, and toggleable debug logging. Applying an app's
configuration to those flags currently requires babel: `setConfig()` feeds `@embroider/macros`,
and the app's babel config must include the embroider macros plugins,
`babel-plugin-debug-macros`, and, for app-side flag use, WarpDrive's own transforms. This causes
four problems:

**1. Other frameworks don't use babel.** WarpDrive ships bindings for React, Vue, and Svelte
alongside Ember, and their default toolchains don't include babel. A React app today must
disable its native transforms and adopt babel *solely to configure WarpDrive*.

**2. Configuration is fragile.** Ember setup threads one config object through
`buildMacros({ configure })`, `setConfig()`, `...macros()`, `...Macros.babelMacros`, and a
`babel-plugin-debug-macros` entry. Each is a chance to miss a piece or wire it in the wrong
order, and missing pieces fail silently.

**3. Babel is a forced cost.** Every file WarpDrive ships must pass through the app's babel
pipeline, and apps must maintain include lists so it does. The plugin transforms only the files
that need it, without babel.

**4. Duplicate `@embroider/macros` copies break config silently.** When a dependency tree holds
more than one copy of `@embroider/macros`, WarpDrive's config can fail to reach the copy
compiling its files, producing wrong or missing stripping with no error. The plugin takes
WarpDrive out of this path without affecting other addons' use of embroider.

The expected outcome: every supported framework configures WarpDrive with one plugin line, Ember
apps keep their existing options, config mismatches become loud errors, and `@embroider/macros`
and babel leave WarpDrive's dependencies on a published timeline.

## Detailed design

### The plugin

`@warp-drive/core/build-plugin` exports a single `warpDrive` object with one adapter per bundler
(built on [unplugin](https://unplugin.unjs.io)), so there is one import path for every bundler
and no per-framework plugin packages:

```js
import { warpDrive } from '@warp-drive/core/build-plugin';

warpDrive.vite(options);     // Vite (Ember via embroider, React, Vue, Svelte, SolidStart, Astro, Nuxt)
warpDrive.webpack(options);  // Webpack (Next.js, Angular's legacy builder)
warpDrive.esbuild(options);  // esbuild (Angular's current builder, via custom-esbuild)
warpDrive.rollup(options);   // also .rolldown(), .rspack(), .rsbuild()
```

The options are the `WarpDriveConfig` object `setConfig` accepts today (`compatWith`,
`deprecations`, `features`, `debug`, `polyfillUUID`, `includeDataAdapterInProduction`), with
identical semantics and environment-variable handling (`EMBER_ENV`, `NODE_ENV`, `IS_TESTING`,
`WARP_DRIVE_FEATURE_OVERRIDE`, and so on). No option is renamed, and the plugin and `setConfig`
always resolve the same options to the same config.

### Usage

**Ember (embroider + Vite):**

```js
// vite.config.mjs
import { ember } from '@embroider/vite';
import { warpDrive } from '@warp-drive/core/build-plugin';

export default {
  plugins: [...ember(), warpDrive.vite({ compatWith: '5.7' })],
};
```

WarpDrive's entries in `babel.config.mjs` are no longer needed (see Migrating). Babel stays for
Ember's own needs, such as decorators and templates.

**Ember (classic ember-cli): no change.** `setConfig(app, __dirname, config)` in
`ember-cli-build.js` remains the whole user surface. The addon wires up the plugin's babel bridge
automatically.

**React (plain Vite):**

```js
// vite.config.mjs
import react from '@vitejs/plugin-react';
import { warpDrive } from '@warp-drive/core/build-plugin';

export default {
  plugins: [react(), warpDrive.vite({ compatWith: '5.7' })],
};
// No babel config and no esbuild: false workaround.
```

**Flags in app code** need no extra configuration. The plugin compiles the same imports
WarpDrive's source uses:

```ts
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

if (DEBUG) {
  // stripped from production builds
}
assert('expected a store', isStore(candidate)); // stripped from production builds
```

The plugin matches only these WarpDrive-owned import specifiers, so it leaves every other
import in app code alone.

### What the plugin transforms

The plugin transforms only files that import the relevant modules:

1. **Published WarpDrive packages** (`@warp-drive/*`, `@ember-data/*`, `ember-data`). The plugin
   applies the app's config to their flags and removes dead branches, producing the same output
   the embroider babel plugin does today. This works on already-published versions, so adopting
   the plugin needs no library upgrade. Embroider macros in any other package are untouched.
2. **Flag imports in app code** (above). The plugin replaces them with constants, and the
   plugin or the app's minifier removes dead branches in production.
3. **`deprecate` and `warn` from `@ember/debug`** in WarpDrive's published files, replacing
   `babel-plugin-debug-macros`. In Ember apps these calls are left as they are, so
   `registerDeprecationHandler` and `expectDeprecation` keep working. In other apps they log to
   the console in development and are stripped in production.

Runtime-toggleable logging is preserved. In dev and test builds,
`setWarpDriveLogging({ LOG_REQUESTS: true })` still works without a rebuild. In production
builds, unconfigured logging compiles to zero bytes.

### One config, no matter how many copies

A dependency tree may contain several copies of the plugin and of WarpDrive's libraries, spread
across bundler worker threads and processes. All of them apply one configuration:

* **Within a process**, every copy of the plugin, of any version, shares one config. A copy too
  old or too new to share it fails the build with an error rather than running with a different
  config.

* **Declaring the same config twice is fine.** Declaring a *different* one is a build error that
  names both sources and the keys that differ:

  ```
  [WarpDrive::build] Conflicting WarpDrive build configs for app '/srv/app'.
    First set from ember-cli-build.js via setConfig() with compatWith: '4.12';
    then from vite.config.mjs via warpDrive.vite() with compatWith: '5.6'.
  WarpDrive config must be identical everywhere it is declared.
  Differing keys: compatWith, deprecations.DEPRECATE_TRACKING_PACKAGE.
  ```

* **Across threads and processes**, the config depends only on the plugin options and
  environment variables, so every worker derives the same one. If a worker's environment
  differs, the build fails with an error instead of producing divergent output.

* **Copies of WarpDrive libraries** are ordinary files. Each copy is transformed with the same
  config.

### Coexistence with `@embroider/macros`

An app can wire both the plugin and embroider's babel pass during migration, in either order:

* The plugin runs before babel. Embroider then finds nothing to do in WarpDrive's files and keeps
  processing every other package's macros as before.
* If embroider runs first, `setConfig` supplies it the same values the plugin would use, and the
  plugin then has nothing left to do.

So **adopting the plugin means adding it, without removing anything first.** Once added, it
handles WarpDrive's files. Removing the old babel entries is optional cleanup. If the two
configs ever disagree, the build fails with the conflict error above.

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
// vite.config.mjs: add the plugin
import { ember } from '@embroider/vite';
import { warpDrive } from '@warp-drive/core/build-plugin';

export default {
  plugins: [...ember(), warpDrive.vite({ compatWith: '5.7' })],
};

// babel.config.mjs: delete the WarpDrive entries. Keep buildMacros only if other addons need it;
// it no longer processes WarpDrive's files either way.
```

The options object moves verbatim from `setConfig` to the plugin call. Classic ember-cli apps
change nothing.

### Deprecating the old API

The babel path (`babelPlugin()`, `buildMacros()` + `setConfig()` wiring, `macros()`, and the
`babel-plugin-debug-macros` entry) is deprecated on the schedule below. The 3-argument classic
`setConfig(app, __dirname, config)` is *not* deprecated. It becomes how classic Ember passes
options to the plugin.

1. **Next 5.x minor:** the plugin ships, and docs recommend it everywhere except classic
   ember-cli. The babel path stays fully supported and silent.
2. **Following 5.x minor:** the babel path prints a one-time informational build notice (not a
   deprecation) linking the migration guide.
3. **6.0:** the babel path issues a build-time deprecation:

   ```
   DEPRECATION [warp-drive.legacy-babel-config]: Configuring WarpDrive through babel
   (babelPlugin(), buildMacros() + setConfig(), macros(), or babel-plugin-debug-macros)
   is deprecated. Add the WarpDrive build plugin to your bundler config instead. It
   replaces all of these entries and accepts the same options:

     // vite.config.mjs
     import { warpDrive } from '@warp-drive/core/build-plugin';
     plugins: [...ember(), warpDrive.vite({ compatWith: '5.7' })]

   Then remove the WarpDrive entries from your babel config.
   Migration guide: https://docs.warp-drive.io/guides/build-plugin-migration
   [deprecation id: warp-drive.legacy-babel-config, since: 6.0, until: 7.0]
   ```

   Also in 6.0, WarpDrive's published packages stop depending on `@embroider/macros`. A build
   with no plugin configured still runs correctly, as an unoptimized development-flavored build
   that logs a one-time warning.
4. **7.0:** the babel path is removed. A babel *bridge* plugin, sharing the plugin's transforms
   and not using embroider, remains available for pipelines that only have babel.

### Ecosystem implications

* **Addons** that use WarpDrive flags are compiled by the app's plugin like app code is. Addons
  that use `@embroider/macros` for their own purposes are unaffected.
* **Ember Inspector and debuggability:** unchanged. `includeDataAdapterInProduction` and the
  runtime logging toggles behave identically.
* **Engines, SSR, and FastBoot:** the plugin runs only at build time, and its output behaves
  like the current pipeline's.
* **Blueprints:** the app blueprint switches to the plugin recipe.
* **Lint rules:** none required.
* **IDE support:** unchanged. Flag imports are real modules with real types.

## How we teach this

Call it "the WarpDrive build plugin": the same build configuration WarpDrive has always had, now
set in the bundler instead of babel. The guides' setup page goes from three paradigm-specific
recipes to one line per bundler, and documents classic ember-cli as "no change." The existing
`WarpDriveConfig` options reference applies as-is.

For existing users, the migration guide is the before/after above plus one rule: *add the
plugin, then delete the babel entries when convenient.* For new users, the plugin recipe is
simpler than what it replaces, and non-Ember framework docs no longer mention babel.

## Drawbacks

* **Install weight:** `@warp-drive/build-config`, which every consumer installs transitively,
  gains `unplugin` and `oxc-parser` (a native-binary parser with a wasm fallback). Both are
  node-only and never bundled, but they add install size and CI surface.
* **Two supported paths until 7.0** (plugin and babel) means double the documentation and
  testing.
* **Weaker hosts have caveats:** esbuild's plugin model limits coexistence with other transform
  plugins (relevant to Angular's builder), and Turbopack supports only a loader-based bridge with
  user-maintained file globs. Both fall back to correct but unoptimized output, not breakage, and
  the support tiers must be documented.
* **Reimplementation risk:** the plugin takes over evaluating the macro expressions WarpDrive
  publishes, which embroider's babel plugin does today. WarpDrive's own publish step is the only
  source of those expressions, which keeps the set small, but WarpDrive now owns this code.

## Alternatives

* **Stay on `@embroider/macros` + babel.** Rejected: babel stays a hard requirement in
  ecosystems that have moved off it, and the duplicate-copy hazard is inherent in the design.
* **Ship a babel plugin instead of a bundler plugin.** Simpler to build, but it fails the main
  motivation (toolchains without babel) and keeps WarpDrive's files in app babel pipelines.
* **Per-framework plugin packages** (`@warp-drive/vite-plugin`, etc.). Rejected: one plugin
  already covers every bundler, and separate packages would add to the version-skew and
  duplicate-copy surface this RFC aims to remove.
* **A new standalone package for the plugin.** Rejected in favor of shipping it from
  `@warp-drive/build-config` (re-exported from `@warp-drive/core`), next to the config code it
  shares, so consumers need no new dependency.
* **Do nothing for non-Ember frameworks** and document babel workarounds. Rejected: disabling
  native TS/JSX transforms to insert babel is the worst part of today's non-Ember experience.

## Unresolved questions

* For classic ember-cli at 6.0, the addon injects the babel bridge into the app's babel options
  automatically. This stays behind a flag for the full 6.0 beta cycle, with a documented manual
  fallback in case it proves unreliable across ember-cli-babel versions and engines setups.
* Default flag values for builds with no plugin configured (post-6.0): lenient, test-friendly
  defaults keep runtime log toggling but weaken the runtime check for duplicate WarpDrive copies.
  Strict defaults make the opposite trade.
* Whether `@warp-drive/core/build-plugin` should also be exposed under the `ember-data` package
  name for apps that consume WarpDrive only through it.
