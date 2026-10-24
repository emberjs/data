---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/rfcs/0003-warp-drive-devtools-extension.md
description: >-
  Proposes a Chrome and Firefox devtools extension for inspecting WarpDrive
  requests, cache, and schemas, attached via a production-strippable hook in
  @warp-drive/core.
---

# A Browser Devtools Extension&#x20;

## Summary

WarpDrive gains a dedicated browser devtools extension (Chrome and Firefox, Manifest V3) built
with Ember and WarpDrive itself. A tiny, production-strippable hook shipped inside
`@warp-drive/core` lets the extension attach to any WarpDrive `Store` on a page with zero
app-side setup, the same pattern React DevTools and Redux DevTools use. The extension gives
visibility and control that `@ember-data/debug`'s ember-inspector integration cannot: a live
request inspector with per-request actions (invalidate, reload, background-reload, force a
pending/error state), a cache explorer over the full schema-driven cache (not just `Model`
records), a schema/relationship-graph explorer, on-page highlighting of `<Request>`-rendered
DOM with hover actions, and runtime toggles for WarpDrive's existing debug-log flags. It ships
in three phases behind one architecture and one versioned protocol, described in full below.

## Motivation

WarpDrive apps today have exactly one inspection tool: `@ember-data/debug`'s ember-inspector
`DataAdapter` integration. It has structural limits that this RFC's target audience — anyone
debugging a real `Store` — runs into immediately:

* It only understands `@ember-data/model`'s `Model` class (`store.modelFor(type).attributes`,
  `store.peekAll(type)`). Apps on `SchemaRecord`/reactive resources, which is the direction
  WarpDrive's own architecture has moved, are invisible to it.
* It exposes per-type record lists and attributes — nothing about `RequestManager`, in-flight
  or completed requests, `Cache` documents, or the relationship graph as a whole.
* It has no concept of "what triggered this fetch" or "is this data still in use anywhere,"
  both of which come up constantly when chasing down redundant requests or stale-cache bugs.
* It is a plugin *inside* ember-inspector's own protocol and panel, so it cannot add its own
  panel layout, an on-page overlay, or interactive graph visualization — ember-inspector's UI
  shell is not built for that.

Issue [#10407](https://github.com/warp-drive-data/warp-drive/issues/10407) already collects
this wishlist from real usage: tracing requests, clean/dirty record state, cache exploration,
invalidating requests, highlighting DOM inside request/await boundaries, and visual schema and
relationship-graph exploration. Issue
[#9518](https://github.com/warp-drive-data/warp-drive/issues/9518) ("cache v3 exploration")
independently flags that the `Cache` interface has no capability for asking "is this request /
resource active," which several of the features below need — this RFC treats that as a
dependency to coordinate on, not something to route around.

Prior art in adjacent ecosystems validates the shape: React DevTools and Redux DevTools both
work via a page-injected global hook plus a three-hop extension bridge; Apollo Client Devtools
and TanStack Query Devtools both ship a request/query list with per-item state and a normalized
cache explorer. None of them do on-page DOM highlighting tied to data-fetching boundaries —
that piece is closer to what React DevTools does for the component tree, applied instead to
WarpDrive's `<Request>` boundaries.

The expected outcome: a WarpDrive app is inspectable and controllable from a standalone
extension the moment the extension is installed, with no app-side integration step, no
`Model`-only limitation, and a UI shell expressive enough for a relationship graph and an
on-page overlay.

## Detailed design

### Why a browser extension, and not an embedded devtools component

TanStack Query and Apollo both primarily ship an *in-app* embedded devtools component (a
floating panel the app itself renders in development). That approach cannot do on-page DOM
highlighting of `<Request>` boundaries from outside the app's own render tree, and it requires
every app to remember to mount it. A browser extension can overlay any page, needs no app-side
mounting, and is the natural home for a relationship-graph visualizer that wants real screen
space. This RFC does not preclude an embedded companion later — the panel UI described below is
itself built from ordinary WarpDrive-consuming Ember code and nothing stops it from being
reused inside an app-embedded shell — but it is out of scope here.

### Architecture: hook, bridge, panel

Three pieces, following the same shape React DevTools and Redux DevTools use:

**1. The hook (`@warp-drive/core/devtools-hook`).** When a `Store` is constructed, and only
when the devtools hook is enabled for the build (see "Production safety" below), the `Store`
registers itself on a page-global registry:

```ts
// conceptually, inside Store's constructor path
if (DEVTOOLS_HOOK_ENABLED) {
  installDevtoolsHook(); // idempotent; installs globalThis.__WARP_DRIVE_DEVTOOLS_GLOBAL_HOOK__ once
  globalThis.__WARP_DRIVE_DEVTOOLS_GLOBAL_HOOK__.registerStore(this);
}
```

The hook is a page-global singleton (keyed like WarpDrive's other page-globals, e.g. the
existing `RuntimeConfig` singleton under a `Symbol.for(...)`/well-known global name) holding a
registry of `{ storeId, store, protocolVersion, capabilities }` — a page can have more than one
`Store` (multiple Ember apps, micro-frontends, iframes), so the registry is a map, not a
singleton store reference. It exposes the minimal surface the bridge needs: enumerate stores,
subscribe to a store's request/cache/notification events, and dispatch an action (invalidate,
reload, etc.) to a specific store. The hook itself does not know about `chrome.*` APIs at all —
it only talks `postMessage`/`CustomEvent` on `window`, so it has zero browser-extension-specific
code and could in principle be driven by something other than this extension (a test harness, a
future embedded panel).

**2. The bridge.** Three standard hops, because a devtools panel cannot reach into the
inspected page directly and a content script cannot reach the devtools panel directly:

```
devtools panel  <—chrome.runtime.connect (Port)—>  background service worker
                                                          |
                                                    chrome.tabs.sendMessage /
                                                    chrome.scripting relay
                                                          |
content script  <——— window.postMessage ———>  page (the hook)
```

The content script is injected at `document_start` in the `MAIN` world (Manifest V3's
`world: "MAIN"` execution context, available in both Chrome and Firefox 128+) purely to
relay `postMessage` traffic between the page's `window` and the extension's isolated messaging
channels — it runs no WarpDrive-aware logic of its own. Firefox support uses
[`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) so the background
script and panel code are written once against the promise-based API and run unmodified on
both browsers; the manifest itself is close enough between MV3 targets that it needs only a
`browser_specific_settings` block for Firefox, not a fork.

**3. The panel.** An Ember app, using WarpDrive's own framework bindings, rendered inside the
devtools panel page each browser provides (`chrome.devtools.panels.create` /
`devtools_page` for Firefox). It receives bridge messages as they arrive and models them as
ordinary WarpDrive requests and cache data — i.e. the extension's own data layer is a
`Store` (or several, one per inspected `Store`), fed by a custom `RequestManager` handler that
turns bridge events into request/response documents. This is both a dogfooding choice (per your
ask that the extension itself be built with Ember + WarpDrive) and a practical one: the panel
gets caching, request-state (pending/error/success), and reactivity for free instead of
reinventing them.

### Protocol versioning and multi-store handling

The extension version and the inspected app's WarpDrive version are independent and can be
arbitrarily far apart — someone can install the latest extension against an app pinned to an
older WarpDrive release. The hook reports a `protocolVersion` and a `capabilities` list on
connect; the panel negotiates against what it knows and degrades gracefully (a feature backed
by a capability the connected hook doesn't report renders as disabled with a "requires WarpDrive
≥ X" note, rather than breaking). This mirrors how React DevTools' frontend tolerates a range of
backend versions.

Because a page can host more than one `Store`, the panel's top-level UI is a store picker
(defaulting to the first registered store when there's only one) whose selection scopes every
other panel to that store's `storeId`.

### Production safety

The hook must never ship in a production bundle by default. It is gated by a new build-config
flag (in the same family as `includeDataAdapterInProduction`), e.g.
`includeDevtoolsHookInProduction`, defaulting to `false`; in development and test builds the
hook is included by default (no app-side setup needed — this is the "always-on in dev" choice
this RFC makes deliberately, matching React/Redux DevTools' zero-config experience), with an
explicit opt-out (`setConfig({ devtoolsHook: false })`) for apps that want it off even in dev.
The hook only ever *reads* store state and *replays* actions the app's own code could already
trigger (re-issuing a request, aborting one) — it never evaluates arbitrary code sent from the
panel, so enabling it does not add a code-execution surface. No data ever leaves the browser:
the bridge is local `chrome.runtime`/`postMessage` traffic only, never a network call.

### Phase 1 — requests, cache, and log toggles

**Request inspector.** `RequestManager.request()` and its handler chain (`manager.ts`) are the
existing seam. A devtools-only handler is registered first in the chain (ahead of the app's own
handlers, alongside where `useCache` inserts the `CacheHandler`) whenever the hook is active. It
observes, per request: the minted `RequestKey`/`.lid`, method and URL, the `GodContext` given to
handlers, dedupe/cache-hit outcome (the same `'ISSUED' | 'DEDUPED' | 'CACHE-HIT'` classification
`CacheHandler` already computes for `LOG_REQUESTS`), timing, and final `StructuredDataDocument`
or `StructuredErrorDocument`. Today that classification only reaches a developer as unstructured
`console.log` text (`store/-private/debug/utils.ts`'s `log()`); this RFC proposes those call
sites also emit through a small structured event (a `DevtoolsEmitter` the log helper and the new
handler both use), so there is one source of truth feeding both the console and the extension
instead of the extension scraping console output.

Per-request actions in the panel:

* **Invalidate / Reload**: re-issue the same request descriptor with `{ cacheOptions: { reload:
  true } }`.
* **Background reload**: re-issue with `{ cacheOptions: { backgroundReload: true } }`.
* **Abort**: call `.abort()` on the live `Future`, for requests still in flight.
* **Force pending / force error**: these have no existing equivalent — nothing in `Cache` or
  `RequestManager` today lets a caller substitute a synthetic outcome for a real network
  response. This RFC proposes a `DevtoolsOverrideHandler`, inserted only when the hook is
  active, that intercepts a request matching a `RequestKey.lid` the panel has armed and resolves
  or rejects it with a synthetic `StructuredDataDocument`/`StructuredErrorDocument` instead of
  calling `next()`. It is a normal handler using the normal handler-chain contract — no new
  primitive on `Cache` or `RequestManager` is needed for this piece.

**Cache explorer.** `store.schema.resourceTypes()` enumerates every known type; `Cache.dump()`
(the same serialization `Cache` already supports for fork/SSR use cases) gives a snapshot of
cache contents without requiring a new export path. Full eager subscription to every resource
identifier does not scale to real app cache sizes, so the explorer tree only subscribes (via
`NotificationManager.subscribe`) to identifiers currently expanded/visible in the panel, and
relies on a lightweight global mutation counter (a per-type "something changed" tick) to know
when a collapsed subtree's summary (count, last-modified) needs refreshing without holding a
live subscription open for it.

**Debug-log toggles.** The panel becomes a UI over the runtime logging flags that already exist
(`setWarpDriveLogging`/`getWarpDriveRuntimeConfig`, `warp-drive-packages/core/src/types/runtime.ts`)
instead of requiring the console. Toggling `LOG_REQUESTS`, `LOG_CACHE`, etc. from the panel calls
the same `setLogging` the console global already calls — no new runtime API, just a UI on top of
one that exists.

### Phase 2 — schema explorer and on-page highlighting

**Schema explorer.** `store.schema.resourceTypes()` plus `schema.fields(type)` /
`schema.resource(type)` give every field and relationship for every type with no private access
(`SchemaService` is already a fully public, enumerable API). The panel renders this as both a
searchable field table per type and a force-directed graph of `belongsTo`/`hasMany`
relationships between types, using the graph purely as a navigation aid (click a node to jump to
that type's field table) rather than trying to make the graph itself the primary data surface.

**On-page highlighting and hover actions.** This is the one feature that needs a small change
outside the devtools packages themselves: `<Request>` (from the Ember/React/Vue/Svelte bindings)
needs to tag its rendered boundary with a stable attribute identifying which `RequestKey` it is
currently rendering — a `data-warp-drive-request` attribute carrying the request's `.lid`,
applied only when the devtools hook is active (so it costs nothing in production and nothing in
dev/test unless the extension is actually attached). The content script's overlay then queries
for elements with that attribute, draws a highlight box on hover with the request's identifier,
and offers the same invalidate/reload/background-reload/abort actions as the request inspector,
routed through the same bridge. This makes the DOM the entry point into the request inspector,
not a separate feature with its own data path.

### Phase 3 — active-resource tracking and request tracing

**Active vs. inactive resources.** No existing capability answers "is this resource or request
currently in use anywhere" — issue #9518 calls out exactly this gap as a Cache v3 concern
(a `capability` for "asking if a given request is active / asking for a list of active
requests"). Rather than inventing a competing mechanism, this RFC proposes an interim
approximation built on what exists today — `NotificationManager.subscribe`'s live subscriber
count for a given identifier, treated as a proxy for "something is currently reading this" — and
explicitly frames the durable answer as depending on whatever capability Cache v3 lands. The
"eject" quick action (distinct from unloading a record outright) is deferred to land alongside
that capability rather than being approximated the same way, since acting on a wrong "unused"
signal is destructive in a way a stale display value is not.

**Tracing a request back to source.** `RequestManager.request()` gains an opt-in capture of
`new Error().stack` at call time, active only when the devtools hook is armed for it (stack
capture has a real perf cost, so it is never on by default even in dev). The panel displays the
captured stack as-is; clicking through relies on the browser's own existing source-mapped stack
rendering rather than this RFC building custom editor-integration — Chrome and Firefox already
resolve dev-build source maps and make stack frames clickable in their native panels, and the
extension's stack display can link into that same behavior instead of re-solving it.

### Package layout

* `@warp-drive/core/devtools-hook` — the page-global hook and its `postMessage` protocol.
  Framework-agnostic, minimal, lives in core so every framework binding gets it identically.
* `@warp-drive/devtools-protocol` — shared TypeScript types for hook ⇄ bridge ⇄ panel messages,
  versioned independently so the extension and a given WarpDrive release can each depend on the
  version they actually implement.
* `warp-drive-packages/devtools-extension` — the shipped product: MV3 manifest, background
  script, content script, and the Ember-based panel app. Lives alongside the other
  WarpDrive-branded packages rather than under `packages/` (the legacy `@ember-data/*` line),
  since this is new surface, not a shim.
* A demo/e2e app for the extension's own test suite fits the existing `tests/` convention (e.g.
  `tests/devtools-extension`), exercising real request/cache/schema scenarios the panel needs to
  render correctly.

## How we teach this

Teach it as "the WarpDrive devtools extension" — install once from the Chrome Web Store or
Firefox Add-ons, works against any WarpDrive app on a development build with no setup. The
guides gain a new page describing what each panel shows and how the quick actions map to
existing `Store`/`RequestManager` concepts (so "invalidate" is taught as "the same as calling
your request again with `reload: true`," not as new vocabulary). Existing debug-log
documentation gains a note that the same toggles are reachable from the extension's UI.
`@ember-data/debug`'s docs get a note that it is deprecated in favor of this extension
([RFC 0005](/rfcs/0005-deprecate-legacy-packages.md)) — not merely "the `Model`-based option
while the extension is the general-purpose one." The request inspector, cache explorer, and
debug-log toggles described above are all `Store`/`RequestManager`/`Cache`-level, not
`Model`-specific, so the extension covers `Model`-based apps' inspection needs too; there is no
capability gap that would justify keeping `@ember-data/debug` around as a permanent parallel
tool for them.

## Drawbacks

* **New shipped product.** A browser extension is a maintenance commitment beyond a library
  release: two extension-store listings, their review processes, and a protocol that has to stay
  compatible across independent WarpDrive and extension release cadences.
* **Bundle-size and surface cost of the hook.** Even minimal, the hook is code that ships in
  every development and test build by default. It is fully stripped in production by default,
  but it is a new tripwire to keep honest as the codebase changes.
* **Two inspection tools during the migration window.** Apps still on `@ember-data/debug`'s
  ember-inspector integration and the new extension can disagree or overlap in scope until
  `@ember-data/debug` is removed at 6.0 per [RFC 0005](/rfcs/0005-deprecate-legacy-packages.md);
  the docs note above is meant to reduce confusion during that bounded window, not indefinitely.
  This also means `@ember-data/debug`'s own deprecation is gated on this RFC actually shipping
  with parity for the ember-inspector workflows apps rely on today — if this extension slips,
  so does that deprecation.
* **Some features are approximations until Cache v3 lands.** Active-resource tracking in Phase 3
  is explicitly a stopgap; it can give a wrong answer for "in use" in cases a real capability
  would not, which is part of why the destructive "eject" action is deferred rather than shipped
  against the same approximation.

## Alternatives

* **Extend `@ember-data/debug` instead of building a new extension.** Rejected: it is
  architecturally tied to `Model` and to ember-inspector's own panel shell, which cannot host a
  relationship-graph visualizer or an on-page overlay; extending it would mean rewriting most of
  it inside someone else's protocol.
* **Ship only an in-app embedded devtools panel** (TanStack Query / Apollo style), no browser
  extension. Rejected as the *only* delivery mechanism because it can't overlay the page for
  DOM highlighting and requires every app to mount it; not rejected as a future addition — the
  panel UI this RFC describes is ordinary WarpDrive-consuming code and nothing here prevents
  reusing it inside an app-embedded shell later.
* **Opt-in devtools addon apps install themselves**, instead of an always-on DEBUG hook.
  Rejected for the initial design: it reintroduces a setup step for every app, undermining the
  "install the extension, it just works" experience this RFC targets, in exchange for a bundle
  savings that the production-stripped, dev/test-only hook already achieves without the setup
  cost.
* **Chrome-only, Firefox later.** Considered and rejected for this RFC: `webextension-polyfill`
  plus MV3's now-shared `world: "MAIN"` content-script execution model make both browsers
  reachable from one implementation, so deferring Firefox would trade a maintained
  cross-browser design for a marginal short-term simplification.

## Unresolved questions

* Exact shape of the `DevtoolsEmitter` that request/cache logging should be refactored to use —
  whether it subsumes today's `log()`/`logGroup()` console helpers or wraps them, and whether it
  becomes a small public API of its own (useful beyond this extension, e.g. for app-level
  telemetry) or stays private to the devtools hook.
* Whether "active resource" tracking should be reachable at all before Cache v3's real capability
  lands, given the risk that its approximation is read as more authoritative than it is — an
  alternative is shipping Phase 3's tracking feature disabled with a "coming soon, pending Cache
  v3" state until the real capability exists.
* Whether the devtools protocol should be exposed as a documented, semver'd package
  (`@warp-drive/devtools-protocol`) that a third party could target for a different frontend
  (e.g. a standalone Electron inspector), or kept as an internal implementation detail between
  the hook and this specific extension until there's a concrete second consumer.
* Where `includeDevtoolsHookInProduction`-style configuration should sit relative to the
  framework-agnostic build plugin described in [RFC 2](/rfcs/0002-warp-drive-build-plugin.md) —
  ideally this RFC's flag is just another `WarpDriveConfig` option handled by the same
  mechanism, but that RFC was still `proposed` at the time of writing.
* What counts as "parity" with `@ember-data/debug` for `Model`-based apps before
  [RFC 0005](/rfcs/0005-deprecate-legacy-packages.md)'s deprecation of that package actually
  takes effect — this RFC and RFC 0005 should stay in sync on that bar rather than each assuming
  the other has defined it.
