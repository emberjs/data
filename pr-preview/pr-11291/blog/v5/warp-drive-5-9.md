---
url: https://canary.warp-drive.io/pr-preview/pr-11291/blog/v5/warp-drive-5-9.md
description: >-
  Learn what changed in WarpDrive 5.9 — reactive pagination, the
  migrate-to-schema codemod, Memory Alpha for AI agents, and rolled-up types —
  and why to install 5.9.1 rather than 5.9.0.
---

# ***Warp*Drive** 5.9

&#x20;  2026-09-05

***Warp*Drive** 5.9 is out, and this post is for apps already on 5.x deciding whether and how
to upgrade. The headline changes are experimental reactive pagination, a codemod that turns
EmberData models into schemas, and a new package of ***Warp*Drive** knowledge for AI coding
agents. Before upgrading, read
[Changes That May Need Attention](#changes-that-may-need-attention): most apps won't hit any of
them, but the two most likely to are that published types are now rolled up per entry point and
that `@warp-drive/holodeck` now replays its fixtures in CI.

## Install 5.9.1, not 5.9.0

The 5.9.0 release did not publish completely. Every package went out at 5.9.0 except
`@warp-drive/experiments`, whose publish failed, so there is no `@warp-drive/experiments` that
goes with 5.9.0. Version 5.9.1, released the same day, fixes the release tooling and publishes
`@warp-drive/experiments` at 5.9.1 alongside everything else
([#11023](https://github.com/warp-drive-data/warp-drive/pull/11023)). It contains no other
changes.

Install 5.9.1 for every ***Warp*Drive** package you use. If you already installed 5.9.0, move
to 5.9.1; there is nothing else to do.

Starting with 5.9.1, `@warp-drive/experiments` is versioned with the rest of the 5.x packages
instead of on its own `0.x` line, so its version always matches theirs.

## Changes That May Need Attention

Each of these can surface after upgrading, and each says what to do about it.

### Types are rolled up per entry point

The `@warp-drive/*` packages now build with rolldown (via tsdown) instead of Vite
([#10643](https://github.com/warp-drive-data/warp-drive/pull/10643)). Imports and module format
are unchanged, but declarations now live in `dist/` next to the JavaScript and are rolled up into
one file per public entry point (`@warp-drive/core` goes from 130 `.d.ts` files to 60). If you
imported a type from an internal module path that isn't a package entry point, it no longer
resolves: import it from its public entry point instead. As a bonus, editor import suggestions now
only offer public paths, and packages ship sourcemaps.

### Holodeck replays in CI

`@warp-drive/holodeck` was meant to record locally and replay from its `.mock-cache` fixtures when
`CI` is set, but it always recorded, so a test whose fixture was never committed still passed in
CI. It now replays as intended
([#10698](https://github.com/warp-drive-data/warp-drive/pull/10698)). If tests start failing in
CI after upgrading, run them locally and commit the fixtures they write; set `IS_RECORDING` to
record even when `CI` is set. Replay also now finds mocks whose URL includes a query string, such
as `GET(this, 'users?name=Chris', ...)`.

### `withArrayDefaults` field types

`withArrayDefaults` from `@warp-drive/legacy/model-fragments` takes an optional second argument
for the item type: `withArrayDefaults('titles', 'string')` produces a field of type
`array:string`, matching `array('string')` in ember-data-model-fragments
([#10421](https://github.com/warp-drive-data/warp-drive/pull/10421)). Without it the field type is
now `array`; it used to be derived from the singularized field name (`array:title`). If you relied
on that, pass the item type explicitly.

### No more `ember` barrel import

`ember-data` and `@warp-drive/legacy` no longer import the `ember` barrel module, removing a
blocker for Ember 7 ([#10513](https://github.com/warp-drive-data/warp-drive/pull/10513)). As a
result, `ember-data` no longer registers itself in `Ember.libraries`, and `cacheFor` on records
using the `EmberObjectExtension` or `EmberObjectArrayExtension` from
`@warp-drive/legacy/compat/extensions` now throws, since Ember removed it with no replacement.

### Generators no longer write classic or pods output

The `ember generate` blueprints for models, adapters, serializers and transforms (and their unit
tests) no longer generate classic `Model.extend()` syntax or pods layouts; they always write native
classes at the default paths
([#10866](https://github.com/warp-drive-data/warp-drive/pull/10866)). See
[`warp-drive generate`](#warp-drive-generate) below.

## New Features

### Reactive pagination (experimental)

`getPaginationState(request)` from `@warp-drive/experiments/pagination` returns a reactive
pagination state for a request, built on the pagination links in ***Warp*Drive** response
documents ([#10014](https://github.com/warp-drive-data/warp-drive/pull/10014)). It comes in two
flavors: paged (`activePage`, `totalPages`, `loadPage(url)`) and infinite (`data`, `hasNext`,
`loadNext()`, `loadPrev()`). Loaded pages are cached per collection, so every component
paginating the same collection shares them while keeping its own navigation state.

```ts
import { getPaginationState } from '@warp-drive/experiments/pagination';

const request = store.request({ url: '/users', method: 'GET' });
const pages = getPaginationState(request);
await request;
await pages.loadNext();
```

Ember apps also get `<Paginate />` and `<EachLink />` from `@warp-drive/ember/experiments`.
`<Paginate />` mirrors `<Request />`'s blocks and picks a flavor with `@mode="paged"` (the default)
or `@mode="infinite"`. This feature lives in `@warp-drive/experiments`, which is one more reason
to install [5.9.1](#install-5-9-1-not-5-9-0).

### Migrate models to schemas with a codemod

`@ember-data/codemods` adds `migrate-to-schema`, which turns EmberData models and mixins into
***Warp*Drive** schemas: a `LegacyResourceSchema` built with `withDefaults`, a TypeScript type, an
extension for computed properties and methods, and traits for mixins and intermediate base classes
([#10466](https://github.com/warp-drive-data/warp-drive/pull/10466)). It handles JavaScript and
TypeScript models, leaves the original files in place, writes to `app/data/` by default, and logs
each file it skips and why. A JSON config covers custom transform types, base classes, monorepo
sources, and where your app imports ***Warp*Drive** APIs from (`warpDriveImports`).

```sh
npx @ember-data/codemods apply migrate-to-schema --project-name my-app
```

The CLI now ships as a portable Node bundle that runs on macOS, Linux and Windows via `npx`,
`pnpm dlx` or `bunx`. See [Using Codemods](/upgrading/v5/codemods.md).

### Memory Alpha: ***Warp*Drive** knowledge for AI agents

`@warp-drive/memory-alpha` is a new package of ***Warp*Drive** knowledge for AI coding agents such
as Claude Code, Codex, Copilot, Cursor and Gemini
([#10665](https://github.com/warp-drive-data/warp-drive/pull/10665)). It has no code: it ships a
`skills/` directory of small, task-focused markdown files, starting with defining a resource schema
and fetching and caching data through the `Store`, plus a `skills/index.md` routing table that
sends an agent straight to the one file matching its task.

To use it, install the package, copy the instruction file for your agent from the package README
(`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, Copilot instructions or a Cursor rule), and point it at
`node_modules/@warp-drive/memory-alpha/skills/index.md`, or serve the `skills/` directory from an
MCP server. The same skills are readable by humans in the [Skills](/skills/) section of the docs
site.

### Stateful request handlers

The `handlers` option of `useRecommendedStore` (`@warp-drive/core`) and `useLegacyStore`
(`@warp-drive/legacy`) also accepts a function that receives the store and returns the handler
list ([#10551](https://github.com/warp-drive-data/warp-drive/pull/10551)). It runs once per store,
the first time `store.requestManager` is read, so handlers can depend on the store or its owner,
such as an Ember service.

```ts
export default useRecommendedStore({
  cache: JSONAPICache,
  handlers: (store) => {
    const authHandler = new AuthHandler();
    setOwner(authHandler, getOwner(store)!);
    return [authHandler];
  },
});
```

### Relationships

* **LinksMode without related links.** `linksMode` relationships no longer require a
  `links.related` link when the payload is "fully linked": a `belongsTo` with `data: null` or a
  related resource in `included`, or a `hasMany` with `data: []` or every member in `included`.
  A relationship with no `data` key still needs a related link. In PolarisMode, a sync `linksMode`
  `belongsTo` can now be set on an editable (checked-out) record, and resources built with
  `withDefaults` get a `$key` field that returns the record's `ResourceKey`. See
  [LinksMode](/guides/the-manual/misc/links-mode.md)
  ([#10524](https://github.com/warp-drive-data/warp-drive/pull/10524)).
* **Abstract polymorphic types need no schema.** For resources defined with schemas, when a
  concrete type's relationship declares `as: 'abstract-pet'`, registering that type's schema also
  builds the schema for `abstract-pet`; before, resolving the relationship threw. A real schema
  you register for the abstract type is merged with the fields its implementers add, and
  development builds now catch conflicting field shapes and point misconfiguration errors at the
  side that needs fixing. See
  [Polymorphism](/guides/the-manual/relational-data/features/polymorphism.md)
  ([#10547](https://github.com/warp-drive-data/warp-drive/pull/10547)).

### Easier migration from `Model`

`@attr`, `@belongsTo` and `@hasMany` in `@warp-drive/legacy/model` accept a `sourceKey` option for
when the API's field name differs from the property name: `@attr('string', { sourceKey:
'first-name' }) firstName` reads and writes `first-name` in the cache
([#10549](https://github.com/warp-drive-data/warp-drive/pull/10549)). The same release fixes
several rough edges for apps that mix `Model`s with schema-only resources while they migrate:
`JSONSerializer`'s `shouldSerializeHasMany` and the `EmbeddedRecordsMixin` work for resources with
no `Model` class, `store.modelFor()` no longer asserts on stores created with
`useLegacyStore({ linksMode: true })`, and looking up fields for a type with no registered model
throws `No model was found for '<type>'` instead of recursing forever.

### `warp-drive generate`

The `warp-drive` CLI adds `warp-drive generate <type> <name>` (aliases `g` and `gen`), which
writes a model, adapter, serializer or transform, or a unit test for one, without going through
ember-cli ([#10866](https://github.com/warp-drive-data/warp-drive/pull/10866)). The `ember
generate` blueprints keep working and now produce the same output as the CLI.

```sh
npx warp-drive generate model taco filling:belongs-to:protein toppings:has-many:topping name:string
```

### Payload validation in the cache log

When [`LOG_CACHE`](/guides/the-manual/debugging/index.md) is on, the payload report
`JSONAPICache` logs in development also checks the compound-document rules of the {json:api}
spec ([#10433](https://github.com/warp-drive-data/warp-drive/pull/10433)). It flags a resource
that appears more than once in the same payload, a relationship whose `data` points at a resource
the payload doesn't include, and an `included` resource that no relationship reaches from the
primary `data`. Duplicates are a common slip in hand-written mocks, and the report names every
place the resource appears.

### Linting

`eslint-plugin-warp-drive` gains its first template rule, `template-always-use-request-content`,
which flags a `<Request>` whose result is never used, which usually means the data is being read
some other way and bypasses the boundary `<Request>` sets up
([#10613](https://github.com/warp-drive-data/warp-drive/pull/10613)). A new
`eslint-plugin-warp-drive/recommended-templates` config wires up `ember-eslint-parser` for
`.gjs`/`.gts` files and enables it. The `no-legacy-imports` autofix now preserves type-only
imports, and reports legacy imports it can't map safely instead of skipping them. See
[Linting](/guides/linting/index.md).

### Fetch improvements

The `Fetch` handler in `@warp-drive/core` now supports `HEAD` requests, resolving them with `null`
content, and requests can pass the native `priority` fetch hint (`'high'`, `'low'` or `'auto'`)
without failing development-mode validation
([#10463](https://github.com/warp-drive-data/warp-drive/pull/10463)).

In development builds, the fetch handler guesses whether Mirage (or another Pretender-based mock)
is serving requests, and the guess can be wrong either way. Call
`globalThis.setWarpDriveIsMaybeMirage(true)` or `(false)` to override it, including outside tests
for Mirage in `ember serve`. A wrong guess also no longer throws when the response's headers are
immutable ([#10543](https://github.com/warp-drive-data/warp-drive/pull/10543)).

## Performance

When a push changes several fields on a record, `JSONAPICache` now hands the store's notification
manager all of them in one call instead of one call per field, which saves work when you push
large payloads. Subscribers see no difference: they are still called once per changed field
([#10614](https://github.com/warp-drive-data/warp-drive/pull/10614),
[#10560](https://github.com/warp-drive-data/warp-drive/pull/10560)). To support this,
`store.notifications.notify()` accepts an array or `Set` of keys, as does a cache's
`notifyChange()` for `'attributes'`. `@warp-drive/core` also exports a new `NotificationChannel`
type (`'local' | 'remote'`) that custom `Cache` implementations can pass to `notify()`,
`subscribe()` and `notifyChange()` to report local edits separately from remote state; leave it
out to keep the old behavior.

## Notable Fixes

* ***Warp*Drive** no longer crashes in environments without full browser globals, like React
  Native. Without `window.addEventListener` and `document`, the online/visibility listeners that
  drive `<Request />` auto-refresh are skipped, and abort errors fall back to a plain `Error` with
  the same `name` ([#10612](https://github.com/warp-drive-data/warp-drive/pull/10612)).
* A sync `linksMode` hasMany on an immutable record no longer goes stale after repeated remote
  updates ([#10560](https://github.com/warp-drive-data/warp-drive/pull/10560)).
* Reading a `hasMany` after a record on its inverse side was unloaded no longer throws "Expected
  localState to be present"; `splice(start)` with no delete count now removes everything from
  `start` onward, like `Array.prototype.splice`; and development builds now throw when two
  relationships on a type declare the same explicit `inverse`, instead of silently corrupting it
  ([#10533](https://github.com/warp-drive-data/warp-drive/pull/10533)).
* `JSONAPISerializer` skips resources of unknown types in a payload's primary `data` array instead
  of crashing, and `RESTAdapter` returns an `InvalidError` instead of throwing when a 422 response
  has a `null` body ([#10649](https://github.com/warp-drive-data/warp-drive/pull/10649)).

## Documentation

The Manual is reorganized into topic sections, and several pages that were placeholders in 5.8 are
now written ([#10519](https://github.com/warp-drive-data/warp-drive/pull/10519)):

* [Reactivity](/guides/the-manual/reactivity/index.md) explains how ***Warp*Drive** uses signals
  as "gates" next to the cache rather than as storage, with new pages on
  [Reactive Control Flow](/guides/the-manual/reactivity/control-flow.md) and
  [Async as Reactive State](/guides/the-manual/reactivity/derivation.md).
* [Debugging](/guides/the-manual/debugging/index.md) covers turning on instrumented logging at
  runtime or build time and what each log flag shows.
* The schema guides gain full pages on [Derivations](/guides/the-manual/schemas/derivations.md),
  [Transformations](/guides/the-manual/schemas/transformations.md),
  [Traits](/guides/the-manual/schemas/traits.md) and
  [Complex Fields](/guides/the-manual/schemas/complex-fields.md).
* The TypeScript guides' examples now import from `@warp-drive/core` and `@warp-drive/legacy`
  instead of the pre-5.x `@ember-data/*` packages.

The [API reference](/api/) also fills in a large number of previously undocumented public types
and members across `@warp-drive/core`, `@warp-drive/legacy`, `@warp-drive/utilities`,
`@warp-drive/ember` and `@warp-drive/react`, with union members and related types now linked to
each other ([#10569](https://github.com/warp-drive-data/warp-drive/pull/10569)).

## Upgrading

Install [5.9.1](#install-5-9-1-not-5-9-0), then check the
[Changes That May Need Attention](#changes-that-may-need-attention) above. If you're moving from
`Model`s to schemas, start with [Using Codemods](/upgrading/v5/codemods.md).

## Thanks

Thank you to everyone who contributed to 5.9: Chris Thoburn
([@runspired](https://github.com/runspired)), Vaibhav Srivastava
([@vaibhav8a](https://github.com/vaibhav8a)), Sergey Astapov
([@SergeAstapov](https://github.com/SergeAstapov)), Bartlomiej Dudzik
([@BobrImperator](https://github.com/BobrImperator)), Sam Van Campenhout
([@Windvis](https://github.com/Windvis)), Krystan HuffMenne
([@gitKrystan](https://github.com/gitKrystan)), Mehul Kiran Chaudhari
([@MehulKChaudhari](https://github.com/MehulKChaudhari)), Chris Manson
([@mansona](https://github.com/mansona)), Marine Dunstetter
([@BlueCutOfficial](https://github.com/BlueCutOfficial)), Markus Sanin
([@mkszepp](https://github.com/mkszepp)), Kirill Shaplyko
([@Baltazore](https://github.com/Baltazore)), Liam ([@evoactivity](https://github.com/evoactivity)),
David Baker ([@acorncom](https://github.com/acorncom)), Michal Bryxí
([@MichalBryxi](https://github.com/MichalBryxi)), Alex Raputa
([@alexraputa](https://github.com/alexraputa)), Leo Euclides
([@leoeuclids](https://github.com/leoeuclids)), Thomas Gossmann
([@gossi](https://github.com/gossi)), PJ Carly ([@pjcarly](https://github.com/pjcarly)),
[@NullVoxPopuli-ai-agent](https://github.com/NullVoxPopuli-ai-agent), Rich Glazerman
([@richgt](https://github.com/richgt)) and [@BoussonKarel](https://github.com/BoussonKarel).

See the full release notes for
[5.9.0](https://github.com/warp-drive-data/warp-drive/blob/v5.9.0/CHANGELOG.md) and
[5.9.1](https://github.com/warp-drive-data/warp-drive/blob/v5.9.1/CHANGELOG.md).
