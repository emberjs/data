---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/rfcs/0004-drop-v1-addon-and-classic-macros-support.md
---

# Dropping V1 Addon and Classic ember-cli Macros Support in 6.0&#x20;

## Summary

WarpDrive's 6.0 major drops two pieces of classic Ember infrastructure: the V1 addon shim
every `@warp-drive/*`/`@ember-data/*`/`ember-data` package still carries as a compatibility
fallback (`addonV1Shim` from `@embroider/addon-shim`, and the `___legacy_support` branch in
`setConfig` that exists only to receive `app.options.emberData`), and the classic ember-cli
macros configuration surface (`setConfig(app, __dirname, config)` called from
`ember-cli-build.js`, `buildMacros()` + `setConfig(macrosConfig, config)` wired by hand into
`babel.config.mjs`, and the accompanying `babel-plugin-debug-macros` entry). After 6.0, every
consumer configures WarpDrive exclusively through the bundler plugin introduced in
[RFC 0002](/rfcs/0002-warp-drive-build-plugin), and every WarpDrive package ships as a
V2-only addon with no V1 fallback. A non-embroider classic Ember build — one without
`@embroider/compat`'s `compatBuild` in `ember-cli-build.js` — can no longer resolve WarpDrive
as an ember-cli addon; it can still depend on WarpDrive as a plain npm package via
`ember-auto-import`, with the tradeoffs that entails (see "Ecosystem implications").

## Motivation

RFC 0002 introduced the build plugin and deprecated the babel-based configuration path, but
it deliberately kept two escape hatches alive through the 6.0 boundary to de-risk that
proposal on its own: classic ember-cli apps could keep calling
`setConfig(app, __dirname, config)` unchanged, with an automatic babel bridge the addon
wires up for them, and WarpDrive's own packages kept their `addonV1Shim` fallback so that an
app running a fully classic (non-embroider) build could still resolve them. Both of those
compatibility paths carry real, ongoing cost, and neither is doing what it was built for
anymore:

**1. The V1 shim keeps a resolution path alive that WarpDrive's own tooling already assumes is
absent.** Apps that haven't adopted embroider at all are still a real, supported part of the
Ember ecosystem — this RFC does not claim otherwise, and does not remove WarpDrive's
consumability by them outright. What the shim specifically buys such an app is resolving
WarpDrive **as an ember-cli addon** — package discovery, `app-js`/`public-assets` merging,
the `included` hook — without embroider's V2 addon support to interpret those conventions. A
classic app could, before and after this RFC, still bring WarpDrive in some other way (for
example via `ember-auto-import` treating it as an external npm dependency — see "Ecosystem
implications" below for what that path does and doesn't get you). What goes away at 6.0 is
only the addon-resolution path, not consumability in general. That's still worth removing:
WarpDrive's
own minimum-supported Ember versions already require embroider for anything but the most
trivial app (Vite, TypeScript, and strict-mode templates all assume it), so the shim spends
real weight — `@embroider/addon-shim` as a dependency of every published package, plus the
`ember-addon.version === 1` branch in every `addon-main.cjs` deleting `treeForApp` — keeping
the *addon-resolution* path alive for a build shape the rest of WarpDrive's tooling already
assumes is absent.

**2. The classic macros path is the thing RFC 0002 was written to replace.** Its own
motivation section lists the failure modes directly: a babel pipeline is a hard requirement
in ecosystems that don't have one, the wiring is easy to get wrong (`buildMacros`,
`setConfig`, `...macros()`, `...Macros.babelMacros`, and a `babel-plugin-debug-macros` entry,
each a chance to omit a piece), and multiple copies of `@embroider/macros` in a dependency
tree silently fail to coordinate. Every one of those problems still exists as long as the
classic path is reachable at all — a deprecation warning does not remove a footgun, it just
labels it. The `___legacy_support` branch in `setConfig` (`warp-drive-packages/build-config/src/index.ts`)
exists solely to reconcile `app.options.emberData` (read by the V1 shim's `included` hook)
against an app that also calls `setConfig` directly — a reconciliation step whose only job is
supporting the path this RFC removes.

**3. Two supported configuration paths is a permanent maintenance and documentation tax.**
`guides/configuration/index.md` currently carries three tabs — Simple Config, Advanced
Config, Ember Apps (classic) — for what is conceptually one operation: hand WarpDrive its
config object. Every new `WarpDriveConfig` option, every bug in config resolution, and every
support question has to account for three wiring shapes instead of one. RFC 0002 already
unified Simple/Advanced Config into the plugin; this RFC finishes the job by retiring the
third.

The expected outcome: one configuration surface (the build plugin, with `compatWith` and
friends), one addon format (V2), `@embroider/macros` and `@embroider/addon-shim` off every
WarpDrive package's dependency list, and a support matrix that no longer has to reason about
classic (non-embroider) Ember builds at all.

## Detailed design

### What "V1 addon support" means here, precisely

Every `@warp-drive/*`, `@ember-data/*`, and `ember-data` package ships `addon-main.cjs`
built on:

```js
'use strict';
const { addonShim } = require('@warp-drive/core/addon-shim.cjs'); // re-exports addonV1Shim
const addon = addonShim(__dirname);
const pkg = require('./package.json');
if (pkg['ember-addon'].version === 1) {
  delete addon.treeForApp;
}
```

`addonV1Shim` (from `@embroider/addon-shim`) is what lets a package written to the V2 addon
spec — no `index.js` addon class, no broccoli trees, just `app-js`/`public-assets` in
`package.json` — still resolve correctly for an ember-cli consumer that predates embroider's
V2 addon support. Every WarpDrive package already declares `"ember-addon": { "version": 2,
... }`; the `version === 1` branch is dead in practice today because nothing in the published
packages sets `version: 1`, but the shim itself, and the `included` hook it wraps (used to
funnel `app.options.emberData` into `setConfig` — see next section), stay live and load on
every classic-build consumer regardless.

At 6.0:

* `addon-main.cjs` is replaced by a plain V2 addon manifest with no shim, no `included`
  hook, and no runtime branch on `ember-addon.version`.
* `@embroider/addon-shim` is removed from every WarpDrive package's dependencies.
* Resolving a WarpDrive package **as an ember-cli addon** requires an embroider-compatible
  resolution (V2 addon support), whether that's a Vite build via `@embroider/vite`, or
  `compatBuild` from `@embroider/compat` in a still-broccoli-based `ember-cli-build.js`. A
  fully classic build — no embroider anywhere in the pipeline — cannot resolve WarpDrive
  packages *as addons* at 6.0, the same way it already cannot resolve any other V2-only addon
  in the ecosystem today.
* This is narrower than "cannot use WarpDrive at all" — see "Ecosystem implications" below for
  the `ember-auto-import` fallback a fully classic app still has, and what it costs.

### What "classic ember-cli macros config" means here, precisely

Three call shapes, all accepted by `setConfig` today
(`warp-drive-packages/build-config/src/index.ts`), are removed:

1. **The 3-argument classic form**, called from `ember-cli-build.js`:

   ```js
   setConfig(app, __dirname, { compatWith: '4.12', deprecations: { /* ... */ } });
   ```

   This is `isEmberClassicUsage` in `setConfig`'s implementation — it calls
   `_MacrosConfig.for(context, appRoot)` to look up (or create) the app's embroider macros
   config by side effect, rather than receiving one directly.

2. **The `emberData` key on an app's own options object**, passed straight to the `EmberApp`
   constructor with no `setConfig` import at all:

   ```js
   // ember-cli-build.js
   const app = new EmberApp(defaults, {
     emberData: { compatWith: '4.12', deprecations: { /* ... */ } },
   });
   ```

   This is the oldest of the three shapes and, unlike the other two, isn't reached by
   calling `setConfig` yourself — it's read by the V1 shim's `included` hook (see previous
   section), which calls `setConfig(app, dirname, { ...app.options?.emberData, ___legacy_support: true })` on every app regardless of whether that app configured
   WarpDrive any other way. `setConfig`'s implementation already throws if this key and a
   direct `setConfig` call are both present, and carries a console-warning message for this
   exact key — written but deliberately never enabled (`warp-drive-packages/build-config/src/index.ts`,
   commented out pending a package rearrangement) — that this RFC's immediate deprecation
   (see "Deprecating now, removing in 6.0") supersedes and finally ships, as a proper
   `expectDeprecation()`-testable deprecation rather than a plain `console.warn`.

3. **The 2-argument advanced form** aimed at a hand-rolled `buildMacros()` instance:

   ```js
   const Macros = buildMacros({ configure: (config) => setConfig(config, { compatWith: '5.7' }) });
   ```

   paired with a manually-added `babel-plugin-debug-macros` entry to convert
   `deprecate`/`warn` calls, and `...Macros.babelMacros` in the babel plugin list.

At 6.0, `setConfig` keeps exactly one signature:

```ts
export function setConfig(config: WarpDriveConfig): void;
```

which registers the config directly on the build plugin's registry (the mechanism RFC 0002
describes under "One config, no matter how many copies") — no `MacrosConfig`, no
`buildMacros`, no app/context object, no `appRoot` string. `setConfig` becomes a thin wrapper
that plugin users don't even need to call directly; passing the same options object to
`warpDrive.vite(options)` (or the adapter for whichever bundler) does the same thing.

Calling `setConfig` with 2 or 3 arguments, or calling `buildMacros`/`babelPlugin` from
`@warp-drive/core/build-config`, throws synchronously at build configuration time (not a
runtime deprecation warning — by 6.0 these entry points no longer exist in the published
type signatures or the compiled output) with a message pointing at the migration guide:

```
Error: setConfig() no longer accepts an ember-cli `app` object or `appRoot` string as of
WarpDrive 6.0. Configure WarpDrive through the build plugin instead:

  // vite.config.mjs
  import { warpDrive } from '@warp-drive/core/build-plugin';
  plugins: [...ember(), warpDrive.vite({ compatWith: '5.7' })]

Migration guide: https://docs.warp-drive.io/guides/build-plugin-migration
```

`babelPlugin()`, the `macros()` helper, and the documented `babel-plugin-debug-macros` entry
are removed from `@warp-drive/core/build-config`'s exports entirely; importing them is a
module-resolution error, not a runtime warning.

### Deprecating now, removing in 6.0

RFC 0002 proposed a staged rollout: the plugin ships silently alongside the classic path,
then a build notice one minor later, then a formal deprecation only in the last 5.x minor
before 6.0 — with removal itself deferred to 7.0, behind an automatically-injected babel
bridge gated by a flag for the full 6.0 beta cycle.

This RFC collapses that timeline instead of extending it: both deprecations below ship in the
very next 5.x minor, alongside the plugin itself, rather than waiting for an interim build
notice — and both are removed outright at 6.0, with no bridge and no flag in either major.

1. **Next 5.x minor:** the plugin ships, and both deprecations below fire immediately.

   * `warp-drive.legacy-babel-config` — fires on every hit of `setConfig`'s
     `isEmberClassicUsage` (3-arg) branch (covering both the direct
     `setConfig(app, __dirname, config)` call and the `app.options.emberData` key, which
     reaches the same branch through the V1 shim's `included` hook), and on every use of
     `buildMacros()` + `setConfig(macrosConfig, config)`. This is orthogonal to which addon
     resolution the app uses — an embroider app that still configures WarpDrive this way
     gets this deprecation, not the next one. Supersedes RFC 0002's plan of a silent notice
     followed by a formal deprecation two minors later; the notice and the deprecation
     collapse into one, and this RFC also finally ships the `emberData`-key warning that
     already exists in source but has stayed commented out (see "classic ember-cli macros
     config" above).
   * `warp-drive.v1-addon-support` — fires when WarpDrive is resolved without embroider's V2
     addon support at all, independent of which of the three config shapes the app uses.
     Pinning down that detection precisely is open — see "Unresolved questions."

   Both are ordinary WarpDrive deprecations, not build notices: listed alongside the other
   entries in `@warp-drive/build-config/deprecations`, testable with
   `assert.expectDeprecation()`, and silenceable via the same `deprecations: { ... }` config
   option as any other — silencing the warning does not change the removal date.
2. **6.0:** both are removed, per the "Detailed design" section above. There is no bridge and
   no flag; an app that has not migrated by 6.0's release fails at build configuration time
   with the error message shown above, and (if it is on a fully classic, non-embroider build)
   can no longer resolve WarpDrive's packages as addons (see "Ecosystem implications" for its
   remaining `ember-auto-import` fallback).

Starting the warning immediately, rather than in the final 5.x minor as RFC 0002 planned,
gives every app the entire remaining 5.x release cycle to migrate instead of just its last
minor — even though the removal target (6.0, not 7.0) is sooner than RFC 0002's original
schedule.

### Ecosystem implications

* **A fully classic (non-embroider) app is not left with zero options**, only without addon
  resolution. It can still adopt `ember-auto-import` and depend on WarpDrive as a plain npm
  package, the same way it would depend on any non-Ember JS library. That path gets
  WarpDrive's compiled output as an opaque external module: none of the build plugin's
  transforms run over it, so there is no deprecation stripping, no canary feature toggling,
  and no app-side flag imports — the app gets an unoptimized, always-development-shaped
  build (or has to fall back to a CDN/unpkg copy). It is a real fallback, not a supported,
  equivalent replacement for addon resolution.
* **Addons that depend on WarpDrive** and use the classic `setConfig(app, __dirname, ...)`
  form in their own `index.js` `included` hook (a pattern several community addons copied
  from WarpDrive's own guides before the plugin existed) break at 6.0 the same way an app
  would, and need the same migration.
* **Ember Engines:** unaffected beyond the general migration — engines already resolve V2
  addons through the host app's embroider pipeline.
* **Blueprints:** the app blueprint's WarpDrive wiring, already updated to the plugin recipe
  under RFC 0002, drops the classic `ember-cli-build.js` tab entirely rather than marking it
  deprecated.
* **Lint rules:** none required; there is no runtime API surface change, only a build-time
  configuration one.
* **`@embroider/macros` and `@embroider/addon-shim`** both leave every WarpDrive package's
  `dependencies`, completing the removal RFC 0002 scheduled for WarpDrive's published output
  format.

## How we teach this

The setup guide (`guides/configuration/index.md`) drops the "Ember Apps" (classic) tab
introduced under RFC 0002's interim period, leaving a single build-plugin recipe per bundler
— there is no longer a paradigm switch to teach at all, only "add this plugin to your
bundler config." The legacy package setup guide
(`guides/configuration/legacy-package-setup/`) is retitled to make clear it documents the 5.x
migration path, not a currently-supported configuration.

The upgrade guide for 6.0 (`upgrading/v6/index.md`) gets a dedicated section listing, in
order: (1) confirm the app builds through embroider (Vite or `compatBuild`) rather than a
fully classic pipeline — a prerequisite independent of WarpDrive; (2) replace any
`setConfig(app, __dirname, ...)` / `buildMacros()` wiring with the plugin call shown above;
(3) delete the now-unused `@embroider/macros`, `babel-plugin-debug-macros`, and
`babel.config.mjs` entries that existed only for WarpDrive. Because both deprecation IDs
(`warp-drive.legacy-babel-config` and `warp-drive.v1-addon-support`) fire starting in the
very next 5.x minor rather than only in the last one before 6.0, most apps should reach 6.0
having already completed this migration, with the entire remaining 5.x cycle to do it in,
rather than discovering it as a breaking change.

## Drawbacks

* **Shorter overall support window than RFC 0002 originally proposed.** RFC 0002 kept the
  classic path and the V1 shim fully supported through 6.0 and promised an indefinite babel
  bridge after that. This RFC removes both at 6.0 with no bridge at all — real apps that would
  have had until 7.0 now have only until 6.0. The immediate deprecation partly offsets this:
  the warning starts the moment this RFC lands rather than in 6.0's final beta, so affected
  apps get the whole current major's release cycle to react, not just its last minor — but the
  net window is still shorter than RFC 0002 promised.
* **Immediate, ecosystem-wide deprecation noise.** Every app still on the classic path or
  relying on V1 addon resolution starts seeing both warnings on its very next upgrade, rather
  than easing in via a silent-then-notice-then-deprecation ramp. This is deliberate — see
  Motivation — but it is a real, immediate cost for apps that have not yet started migrating.
* **No escape hatch after 6.0.** Unlike the 7.0 "babel bridge remains available indefinitely"
  promise in RFC 0002, this RFC leaves no supported way to configure WarpDrive without the
  bundler plugin, and no supported way to resolve WarpDrive packages without embroider's V2
  addon support, once 6.0 ships.
* **Community addons that copied the classic recipe** from WarpDrive's own older guides (the
  "Advanced Config" tab) inherit this break even if they never touch WarpDrive's plugin
  themselves, since their own `included` hooks call the same removed `setConfig` shape.

## Alternatives

* **Keep RFC 0002's original schedule** (deprecate at 6.0, remove at 7.0 with an indefinite
  babel bridge). Rejected here because it keeps every problem in the Motivation section
  reachable for one more full major, and keeps `@embroider/macros` and `@embroider/addon-shim`
  in WarpDrive's dependency tree that much longer.
* **Keep RFC 0002's staged ramp (silent → build notice → formal deprecation) but still remove
  at 6.0 instead of 7.0.** Considered as a middle ground. Rejected: the ramp's only purpose is
  easing apps into a warning that will eventually fire regardless, and shortening the removal
  target to 6.0 without also starting the warning immediately would leave apps with less
  total notice than today's plan, not more — the ramp made sense paired with a 7.0 removal,
  not a 6.0 one.
* **Drop only the classic macros config, keep the V1 shim.** Rejected: the V1 shim's
  `included` hook is what feeds `app.options.emberData` into the classic `setConfig` path in
  the first place, so removing one without the other leaves a live entry point into code this
  RFC deletes.
* **Drop only the V1 shim, keep classic macros config for embroider-based classic builds.**
  Considered, since `compatBuild` apps without Vite could theoretically keep calling
  `setConfig(app, __dirname, ...)` while still resolving WarpDrive as a V2 addon. Rejected for
  consistency: RFC 0002's plugin already supports `compatBuild` pipelines (it runs ahead of
  babel regardless of bundler), so there is no build shape left that needs the classic
  signature once the plugin exists — keeping it only prolongs the two-paths maintenance cost
  this RFC exists to end.
* **Ship the flag-gated automatic babel bridge from RFC 0002's unresolved question, then
  remove it later.** Rejected: building and testing an automatic bridge (detecting the app's
  babel setup and injecting compatible config) is nontrivial work for a path this RFC
  proposes to delete outright; the effort is better spent on migration tooling (a codemod, see
  Unresolved questions) that gets apps off the classic path rather than papering over it.

## Unresolved questions

* Whether a codemod should ship alongside the 6.0 release (or earlier, during the deprecation
  period) that rewrites a classic `ember-cli-build.js` `setConfig` call and a `babel.config.mjs`
  `buildMacros`/`setConfig` pair into the equivalent plugin call automatically, versus leaving
  this as a documented manual migration.
* Whether the `warp-drive.v1-addon-support` deprecation can be made precise enough to fire
  only for apps that would actually fail at 6.0 (i.e. those without embroider V2 addon
  resolution), as opposed to firing for every app that hasn't explicitly opted into the
  plugin yet, which would over-warn compatBuild-based apps that face no V1-addon break at all.
* How long the legacy package setup guide should stay published as a historical reference
  for teams mid-upgrade, versus being removed once 6.0 is released.
