---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/rfcs/0005-deprecate-legacy-packages.md
description: >-
  Proposes deprecating the ember-data package, every @ember-data/* package, and
  @warp-drive/core-types now, in favor of their already-shipping @warp-drive/*
  successors, with removal from publishing targeted for 6.0.
---

# Deprecating the Legacy ember-data Packages and @warp-drive/core-types&#x20;

## Summary

The `ember-data` package, every `@ember-data/*` package (`active-record`, `adapter`, `codemods`,
`debug`, `graph`, `json-api`, `legacy-compat`, `model`, `request`, `request-utils`, `rest`,
`serializer`, `store`, `tracking`), and `@warp-drive/core-types` are deprecated starting in the
next 5.x minor, with removal from npm publishing at 6.0. Most of these are already, today, a
thin re-export shim over a `@warp-drive/*` package introduced by the package-unification effort
([emberjs/rfcs#1075](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/)) —
`@warp-drive/core`, `@warp-drive/legacy`, `@warp-drive/utilities`, `@warp-drive/json-api`, and
`@warp-drive/ember`. The two exceptions get a successor as part of this RFC rather than reusing
an existing shim: `@ember-data/debug`'s ember-inspector integration is superseded by the
WarpDrive DevTools browser extension proposed in
[RFC 0003](./0003-warp-drive-devtools-extension.md), and `@ember-data/codemods` is renamed to
`@warp-drive/codemods`. For the rest, this RFC does not move any logic; it formalizes the
deprecation of the old import paths that RFC 1075 already implied, with concrete deprecation
flags/ids and documentation updates, landing now, on the same `since <5.x>` / `until 6.0`
timeline every other active deprecation in `deprecations.ts` already uses. The mechanical import
rewrite itself needs no new tooling: `eslint-plugin-warp-drive`'s `no-legacy-imports` rule
already autofixes exactly this rename, and already ships enabled in its `recommended` config.

## Motivation

RFC 1075 unified WarpDrive's packages so that an app installs `@warp-drive/core` and a small
number of framework/feature packages instead of assembling a dozen `@ember-data/*` packages by
hand. That work is done: every legacy package's `src/index.ts` is now nothing but a re-export.
For example:

```ts
// packages/store/src/index.ts
export { Store as default } from '@warp-drive/core';
```

```ts
// packages/core-types/src/index.ts
export type * from '@warp-drive/core/types';
```

Despite this, the legacy packages are still published, versioned in lockstep with everything
else, documented as a first-class install path (`guides/configuration/legacy-package-setup`
still lists `@ember-data/store`, `@ember-data/request`, `@warp-drive/core-types`, etc. as "the
current setup"), and tested as if they were independent implementations. Carrying two import
paths to the same code indefinitely means:

* **Doubled documentation and onboarding surface.** New users following the legacy setup guide
  learn a five-to-fourteen-package install command for functionality that `@warp-drive/core`
  (plus at most `@warp-drive/ember`) already provides in one or two packages.
* **A confusing dependency graph for tooling.** Bundlers, TypeScript, and vite in particular
  handle the `ember-data` meta-package's automatic dependency bundling poorly (already called
  out in the legacy setup guide's own "What about the `ember-data` package?" section) — the
  fix has existed since RFC 1075 shipped, but nothing tells an app it should stop relying on the
  meta-package.
* **No signal that the shims are temporary.** `@warp-drive/core-types`'s package description
  already says `(Legacy)`, but nothing else — no build-time warning, no npm deprecation notice,
  no migration guide — tells a consumer that importing from `@ember-data/model` instead of
  `@warp-drive/legacy/model` is a choice with an expiration date.

The expected outcome: starting in the next 5.x minor, every consumer importing from a legacy
package sees a clear, actionable deprecation pointing at the exact `@warp-drive/*` replacement
import, with `eslint --fix` performing the rewrite mechanically via the already-shipping
`no-legacy-imports` rule; at 6.0, WarpDrive stops publishing new versions of the legacy packages,
and the legacy setup guide is replaced entirely by the unified one.

## Detailed design

### What's covered and what it maps to

Every legacy package's replacement — a re-export target confirmed by reading its `src/index.ts`
for most of them, or a successor this RFC introduces for the two that don't have one yet:

| Legacy package | Deprecated now, removed at 6.0 | Replacement |
| --- | --- | --- |
| `ember-data` | Yes | `@warp-drive/core` (+ `@warp-drive/ember` for Ember apps, `@warp-drive/legacy` for Model/Adapter/Serializer) |
| `@warp-drive/core-types` | Yes | `@warp-drive/core/types` |
| `@ember-data/store` | Yes | `@warp-drive/core` |
| `@ember-data/graph` | Yes | `@warp-drive/core` (`/graph`) |
| `@ember-data/request` | Yes | `@warp-drive/core/request` |
| `@ember-data/request-utils` | Yes | `@warp-drive/utilities` (`/handlers`, `/string`) |
| `@ember-data/json-api` | Yes | `@warp-drive/json-api` |
| `@ember-data/model` | Yes | `@warp-drive/legacy/model` |
| `@ember-data/adapter` | Yes | `@warp-drive/legacy/adapter` |
| `@ember-data/serializer` | Yes | `@warp-drive/legacy/serializer` |
| `@ember-data/legacy-compat` | Yes | `@warp-drive/legacy/compat` |
| `@ember-data/rest` | Yes | `@warp-drive/utilities/rest` + `@warp-drive/legacy` (`/adapter/rest`, `/serializer/rest`) |
| `@ember-data/active-record` | Yes | `@warp-drive/utilities/active-record` |
| `@ember-data/tracking` | Already deprecated (`DEPRECATE_TRACKING_PACKAGE`, since 5.5, until 6.0) | `@warp-drive/ember/install` |
| `@ember-data/debug` | Yes | the WarpDrive DevTools browser extension ([RFC 0003](./0003-warp-drive-devtools-extension.md)) — not a code change, see "Packages without an import-path replacement" |
| `@ember-data/codemods` | Yes | `@warp-drive/codemods` (new package; a rename, not an absorption — see "Packages without an import-path replacement") |

`@ember-data/tracking` already has a resolved deprecation story under `DISABLE_7X_DEPRECATIONS`'s
sibling flags and is unaffected by this RFC beyond being folded into the same messaging pass.

### Deprecation flags

Three new flags are added to `warp-drive-packages/build-config/src/deprecations.ts`, following
the existing shape (`DEPRECATE_TRACKING_PACKAGE`, `DEPRECATE_EMBER_INFLECTOR`, etc.):

```ts
/**
 * <Badge type="warning" text="warp-drive:deprecate-core-types-package" />
 *
 * Deprecates `@warp-drive/core-types`, which has been a pure type re-export
 * of `@warp-drive/core/types` since its unification. Import types directly
 * from `@warp-drive/core/types` instead.
 *
 * @since 5.11
 * @until 6.0
 * @public
 */
export const DEPRECATE_CORE_TYPES_PACKAGE: boolean = true;

/**
 * <Badge type="warning" text="warp-drive:deprecate-ember-data-packages" />
 *
 * Deprecates the `ember-data` package and every `@ember-data/*` package
 * (`active-record`, `adapter`, `codemods`, `graph`, `json-api`,
 * `legacy-compat`, `model`, `request`, `request-utils`, `rest`,
 * `serializer`, `store`). Each is either a re-export shim over a
 * `@warp-drive/*` package, or (for `codemods`) renamed outright to one;
 * import from or install the `@warp-drive/*` package directly instead.
 *
 * @since 5.11
 * @until 6.0
 * @public
 */
export const DEPRECATE_EMBER_DATA_PACKAGES: boolean = true;

/**
 * <Badge type="warning" text="warp-drive:deprecate-ember-data-debug-package" />
 *
 * Deprecates `@ember-data/debug`'s ember-inspector integration in favor of
 * the WarpDrive DevTools browser extension. Unlike the other flags in this
 * group, there is no import to rewrite: uninstall `@ember-data/debug` and
 * install the browser extension instead.
 *
 * @since 5.11
 * @until 6.0
 * @public
 */
export const DEPRECATE_EMBER_DATA_DEBUG_PACKAGE: boolean = true;
```

`DEPRECATE_EMBER_DATA_DEBUG_PACKAGE` is split out from the rest because its resolution isn't an
import rewrite — it's a tool swap, so it gets its own message and isn't a candidate for the
`eslint-plugin-warp-drive` autofix described below. The other two flags stay coarse-grained (one
for `core-types`, one for the whole `ember-data` import-rewrite family) rather than one flag per
package, matching how the legacy setup guide already treats the family as a single install
decision ("What about the `ember-data` package?"). A dozen near-identical per-package flags would
multiply the deprecation surface without giving apps a meaningfully different way to resolve
them — the fix is the same import rewrite in every case.

### Runtime warning

Each legacy package's shim entrypoint gains a one-time `deprecate()` call, guarded by its flag,
following the same shape as `packages/store/src/index.ts`'s existing
`DEPRECATE_TRACKING_PACKAGE` check:

```ts
if (DEPRECATE_EMBER_DATA_PACKAGES) {
  deprecate(
    `Importing from '@ember-data/model' is deprecated. Import from '@warp-drive/legacy/model' ` +
      `instead. Enable eslint-plugin-warp-drive's recommended config and run \`eslint --fix\` ` +
      `to update your imports automatically.`,
    false,
    {
      id: 'warp-drive.deprecate-ember-data-packages',
      until: '6.0.0',
      for: 'warp-drive',
      since: { enabled: '5.11.0', available: '5.11.0' },
      url: 'https://deprecations.emberjs.com/id/warp-drive.deprecate-ember-data-packages',
    }
  );
}
```

`@warp-drive/core-types`'s shim gets the equivalent call under `DEPRECATE_CORE_TYPES_PACKAGE`
with `id: 'warp-drive.deprecate-core-types-package'`. `@ember-data/debug` gets its own message
under `DEPRECATE_EMBER_DATA_DEBUG_PACKAGE`, pointing at the extension instead of an import:

```ts
if (DEPRECATE_EMBER_DATA_DEBUG_PACKAGE) {
  deprecate(
    `'@ember-data/debug' is deprecated. Uninstall it and install the WarpDrive DevTools ` +
      `browser extension instead: https://docs.warp-drive.io/guides/devtools`,
    false,
    {
      id: 'warp-drive.deprecate-ember-data-debug-package',
      until: '6.0.0',
      for: 'warp-drive',
      since: { enabled: '5.11.0', available: '5.11.0' },
      url: 'https://deprecations.emberjs.com/id/warp-drive.deprecate-ember-data-debug-package',
    }
  );
}
```

All three flags default to `true` (the deprecated behavior is active) exactly like every other
flag in `deprecations.ts`, so opting out early — silencing the warning as soon as it ships — is
not offered; unlike a behavior deprecation, there's no "not yet migrated" code path to keep alive
here, only an import path (or, for `debug`, a tool) to change.

### npm-level deprecation

Every legacy package's `package.json` `description` is updated to lead with `(Legacy)` (already
true for `@warp-drive/core-types`; not yet true for the `@ember-data/*` family or `ember-data`
itself), and at the same 5.x minor that ships the flags above, each package's npm registry entry
gets an `npm deprecate` message pointing at the migration guide (see "How we teach this"). This
is metadata only — `npm install` continues to work unchanged for every version published through
the last 5.x release; the notice surfaces immediately in `npm install` output and on the
npmjs.com package page, well ahead of the 6.0 removal.

### Automated migration

No new tooling needs to be built for the mechanical import rewrite. `eslint-plugin-warp-drive`
already ships `no-legacy-imports` (`warp-drive/no-legacy-imports`), an autofixable rule enabled
by default in its `recommended` config, driven by a generated, export-level mapping table
(`public-exports-mapping-5.5.enriched.json`) that already covers every re-export-shim package in
the table above — including the `rest`/`active-record` split, since the mapping is per-export,
not per-module (e.g. `import { findRecord } from '@ember-data/rest/request'` already rewrites to
`import { findRecord } from '@warp-drive/utilities/rest'`). Running `eslint --fix` with
`recommended` enabled is the actual migration path this RFC relies on for those packages. The
mapping table gains one more entry for this RFC: `@ember-data/codemods`'s exports routed to
`@warp-drive/codemods`, the same as any other renamed module specifier.

Two gaps this doesn't cover:

* The rule only rewrites static `import` declarations. Namespace imports, `export * from`
  re-exports, CommonJS `require`, and dynamic `import()` are flagged without an autofix and need
  manual migration — worth stating plainly in the migration guide rather than implying
  `eslint --fix` alone finishes the job for every app. An app must also already have
  `eslint-plugin-warp-drive`'s `recommended` config enabled to get the autofix at all; the
  migration guide should call out enabling it as step one for apps that haven't adopted it yet.
* `@ember-data/codemods`'s CLI invocation (`npx @ember-data/codemods ...`) isn't a JS import and
  isn't touched by the lint rule; switching it to `npx @warp-drive/codemods ...` is a manual,
  one-line change called out in the deprecation message and migration guide.
* `@ember-data/debug` has no autofix at all, covered next.

### Packages without an import-path replacement

Two packages' replacements aren't "import from a different specifier," so they don't fit the
re-export-shim story the rest of this RFC relies on:

* **`@ember-data/debug`** provides the Ember Inspector data adapter. Its replacement is the
  WarpDrive DevTools browser extension proposed in
  [RFC 0003](./0003-warp-drive-devtools-extension.md) — a different tool entirely, installed in
  the browser rather than imported in code. RFC 0003 itself, as drafted, describes the two
  coexisting indefinitely ("`@ember-data/debug`'s docs get a note that it remains the
  ember-inspector integration for `Model`-based apps"); this RFC instead treats the extension as
  `@ember-data/debug`'s full replacement and deprecates the package on the same timeline as
  everything else here. That means this RFC's `@ember-data/debug` deprecation is contingent on
  RFC 0003 landing — the deprecation message has nothing to point at otherwise.
* **`@ember-data/codemods`** has no `@warp-drive/*` successor today; this RFC creates one by
  renaming it to `@warp-drive/codemods` — moving `packages/codemods` under the new name and
  leaving `@ember-data/codemods` as a deprecated re-export/CLI shim over it, the same pattern
  every other package in the table already follows, just newly created rather than pre-existing.

### Timeline

1. **Next 5.x minor:** all three flags ship (default `true`); the runtime warnings and npm
   deprecation metadata ship together (the `eslint-plugin-warp-drive` autofix already exists
   today, and gains the new `@ember-data/codemods` mapping entry). `@warp-drive/codemods` is
   published for the first time, and `ember-data`, every `@ember-data/*` package, and
   `@warp-drive/core-types` show a deprecation on install and on first import — `@ember-data/debug`
   only once [RFC 0003](./0003-warp-drive-devtools-extension.md)'s extension has landed.
2. **Remaining 5.x betas/minors:** the warning and the `eslint --fix` autofix are the primary
   support surface; no further behavior change. This is the entire migration window — it ends at
   the next major.
3. **6.0:** WarpDrive stops publishing new versions of the deprecated packages. Versions already
   published through the last 5.x release remain installable indefinitely (npm does not support
   retracting published versions), so apps that never migrate are not broken outright — they
   simply stop receiving fixes, security patches, and compatibility updates for those packages
   from 6.0 onward.

This mirrors the `since <5.x>` / `until 6.0` shape already used by every other active flag in
`deprecations.ts` (`DEPRECATE_TRACKING_PACKAGE`, `DEPRECATE_EMBER_INFLECTOR`, and the rest) — this
RFC's flags resolve on the same release boundary, rather than opening a new post-6.0 deprecation
window the way a behavior flag typically would. The difference from a behavior flag is *what*
"resolving" means: there's no source inside a still-shipping package to delete at 6.0, because the
deprecated thing is the package's own continued publication, not code inside a package that
keeps shipping. The "removal" is that the legacy packages' own releases stop.

## How we teach this

* `guides/configuration/legacy-package-setup/index.md` gets a deprecation banner at the top
  (the page already carries a "Boilerplate Sucks" callout pointing at RFC 1075; this RFC extends
  that callout to state the deprecation is immediate and end-of-publishing lands at 6.0, plainly
  and with a date once one is set) and its package-list code blocks get inline notes next to
  each deprecated package naming its replacement.
* A new `upgrading/v6/` page (alongside the existing `upgrading/v5/`) documents the full mapping
  table from "Detailed design" as the canonical migration reference, plus how to enable
  `eslint-plugin-warp-drive`'s `recommended` config and run `eslint --fix`.
* The runtime deprecation message itself (see "Runtime warning") is the primary channel most
  developers see this through — it names the exact replacement import and the exact autofix
  command, no lookup required.
* This is taught as "finishing package unification," not as a new idea: RFC 1075 is where users
  already learned that `@warp-drive/core` is the way forward. This RFC's messaging should link
  back to it rather than introduce new terminology.
* `@ember-data/debug`'s deprecation message and migration-guide entry link to RFC 0003's
  devtools extension docs, not to an import-path change — it should read plainly as "switch
  tools," not as a variant of the same "change this import" instruction every other row gets.

## Drawbacks

* **The migration window is short.** Deprecating now with removal at the very next major gives
  apps only the remainder of the current 5.x line to migrate, rather than a full major's worth of
  beta/minor cycles. Every other flag in `deprecations.ts` gets that same window in principle
  (`since 5.x` / `until 6.0`), but most of them were introduced earlier in the 5.x line than this
  RFC lands — apps adopting this deprecation late in 5.x genuinely have less time than apps that
  picked up, say, `DEPRECATE_TRACKING_PACKAGE` at 5.5. The existing `eslint-plugin-warp-drive`
  autofix is not optional polish here; it is load-bearing for apps to make this window — and it
  only helps apps that have already adopted the plugin's `recommended` config, which not every
  app has.
* **Two of the three flags are coarse-grained** rather than one per package, so an app can't
  resolve the deprecation for, say, just `@ember-data/model` while keeping the warning active for
  `@ember-data/rest` — it resolves the whole `ember-data` import-rewrite family at once. This
  trades precision for a simpler mental model matching how the packages are already documented
  and installed.
* **`ember-data` is the simplest onboarding path today** for tutorials and small test apps that
  don't want to reason about which of five-to-fourteen packages to install. Deprecating it raises
  the bar for a "just try it" first install, unless the unified `@warp-drive/core` install path
  is brought to at least the same one-command simplicity before 6.0 ships (tracked by the
  existing `@warp-drive/core` setup docs, not by this RFC).
* **6.0 is a lifecycle boundary for two unrelated deprecations at once.** This RFC's packages
  finish their deprecation and stop publishing at 6.0; [RFC 0002](./0002-warp-drive-build-plugin.md)'s
  babel build path only *begins* its formal deprecation at 6.0 (removed later, at 7.0). An app
  reading both at the 6.0 boundary needs to understand it's losing the legacy packages outright
  while merely being warned about the babel path — the two migration guides should say this
  explicitly rather than let the shared version number imply a shared timeline.
* **`@ember-data/debug`'s deprecation depends on a separate, unlanded RFC.** Tying its removal
  to [RFC 0003](./0003-warp-drive-devtools-extension.md) means this RFC's timeline for that one
  package is only as solid as RFC 0003's own; if the extension slips, `@ember-data/debug` either
  slips with it or ships without a real replacement yet. RFC 0003 as currently drafted also
  expects the two tools to coexist rather than one replacing the other — this RFC overrides that
  expectation, which RFC 0003 should be updated to reflect rather than have two RFCs disagree.
* **No automatic migration for `@ember-data/debug`.** Unlike every other package here, there's no
  `eslint --fix` for "install a browser extension" — apps get a message and a link, not a
  mechanical fix, which is a meaningfully worse migration experience than the rest of this RFC.
* **`@warp-drive/codemods` is a new package, not an existing shim.** Every other replacement in
  this RFC already exists and is already tested; `@warp-drive/codemods` has to be created
  (renamed from `packages/codemods`) as part of landing this RFC, which is real work beyond
  "add a deprecation flag" for this one package.

## Alternatives

* **Do nothing; keep the legacy packages fully supported indefinitely.** Rejected: it commits
  WarpDrive to documenting, testing, and versioning shim code that does nothing but re-export,
  forever, with no path to ever simplifying the package graph RFC 1075 was meant to simplify.
* **Remove the legacy packages outright, immediately, with no deprecation period.** Rejected:
  skips the standard deprecate-then-remove cycle this codebase already uses for every other
  breaking change (see every other flag in `deprecations.ts`), and would break any app that
  hasn't migrated with no warning at all.
* **Deprecate at 6.0 and remove at 7.0**, mirroring the timeline this RFC originally proposed and
  the one [RFC 0002](./0002-warp-drive-build-plugin.md) uses for the babel build path. Superseded
  in this revision: it opens a new post-6.0 deprecation window instead of resolving on the same
  `since 5.x` / `until 6.0` boundary every other flag in `deprecations.ts` already uses, and
  delays finishing RFC 1075's package unification by a full extra major for packages that have
  had a working replacement for some time.
* **Deprecate only `@warp-drive/core-types`, leave the `@ember-data/*` family alone.** Rejected:
  every `@ember-data/*` package is the same re-export-shim situation as `core-types`; singling
  out `core-types` leaves the larger and more visible part of the problem (the `ember-data`
  meta-package and its dependents) unaddressed.
* **Per-package deprecation flags (a dozen-plus flags instead of three).** Considered and
  rejected for this RFC in favor of the coarser grouping described in "Deprecation flags" — see
  "Drawbacks" for the trade-off this gives up.
* **Build a dedicated `legacy-imports` codemod in `@ember-data/codemods`.** Considered, and
  rejected as redundant once `eslint-plugin-warp-drive`'s `no-legacy-imports` rule was found to
  already perform the identical autofixable rewrite off a generated, export-level mapping table.
  Building a second tool would mean maintaining two mapping tables for the same rename instead
  of one.

## Unresolved questions

* Whether this RFC's `@ember-data/debug` deprecation should be a normative amendment to RFC
  0003 (updating its "two inspection tools" framing) or stay a standalone claim in this RFC —
  and what happens to this RFC's timeline if RFC 0003 isn't ready by the time 6.0 ships.
* Whether apps that haven't adopted the RFC 0003 extension by 6.0 lose `Model`-based
  ember-inspector support outright, or whether `@ember-data/debug` needs a short grace period
  past 6.0 specifically (unlike every other package in this RFC) to avoid that gap.
* Whether the remaining 5.x window before 6.0 is long enough for apps to migrate given the
  existing `eslint-plugin-warp-drive` autofix, or whether this RFC's landing should be gated on
  6.0 being at least a certain number of 5.x minors away at the time it merges.
* Whether the `no-legacy-imports` mapping table (currently named/versioned as
  `public-exports-mapping-5.5.enriched.json`) needs a refresh or rename as part of this RFC, and
  what should extend it to cover namespace imports, re-exports, and `require`/dynamic `import()`
  given those are the one gap in the otherwise-automatic migration path.
* Whether `npm deprecate` notices should be applied to already-published pre-deprecation
  versions retroactively, or only to versions published at/after the flags ship.
* Final wording and placement of the `upgrading/v6/` migration page relative to the existing
  `upgrading/v5/` content.
