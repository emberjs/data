---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/rfcs/0001-warp-drive-transactional-notifications.md
description: >-
  Proposes delivering all WarpDrive cache notifications in one synchronous batch
  at transaction close and rebuilding request state as signals-backed data.
---

# Transactional Notification Delivery and Reactive Request State&#x20;

## Summary

WarpDrive currently delivers cache-change notifications under five distinct
timing policies that grew independently: immediate per-call delivery,
transaction-deferred delivery (relationships only), request-window buffering
(`_enableAsyncFlush`), a synchronous-render escape hatch
(`willSyncFlushWatchers`), and consumer-forced flushes. This RFC replaces all
five with a single rule — **every write to store-managed state happens inside
a transaction, and all notifications from a transaction are delivered in one
synchronous batch when it closes** — and rebuilds the request-state layer
(`RequestStateService`) as transactionally-written, signals-backed data so
that record data and request status can never be observed out of sync.

## Motivation

### The problem: five flush policies, zero mental models

The `NotificationManager` is how WarpDrive tells reactive layers (records,
record arrays, documents, request states) that cache state changed. When a
notification is *delivered* determines what a renderer or an interleaved
promise continuation observes. Today that timing depends on which of five
policies a given write happens to hit:

1. **Immediate**: a bare `notify()` (attributes, state, added/removed, …)
   flushes the entire buffer synchronously before returning — including
   mid-`cache.put`, while a payload is half-applied.
2. **Transaction-deferred**: relationship notifications from the graph defer
   to the notify phase of the store's internal transaction
   (`store._schedule('notify')`), so they are never dispatched
   mid-graph-sync.
3. **Request windows**: request/push processing sets `_enableAsyncFlush`,
   buffers everything, and relies on an explicit `notifications._flush()`
   later — hand-rolled in five places with five slightly different shapes.
4. **Sync-render bypass**: when the configured signals implementation reports
   `willSyncFlushWatchers()`, buffering is skipped so a synchronous render
   cannot observe stale state.
5. **Forced flushes**: internal consumers (legacy relationship support, the
   request cache via `_onNextFlush`) flush or sequence against the buffer
   directly because none of the above gives them a reliable "the world is
   consistent now" point.

These are all partial answers to one question — *when is the current unit of
work done?* — using three incompatible definitions of "unit of work."

### The concrete failures this causes today

**Torn synchronous reads.** Between a response's `cache.put` and its
finalize-time flush there are several microtask hops. Any code that runs in
those gaps sees an incoherent mix: `peekRecord` returns a record that
`peekAll` does not yet contain; a record field read before the request
returns its stale memoized value while a never-read field on the same record
computes fresh from the new cache.

**Cross-request mingling.** The notification buffer is shared. When two
responses are processed in adjacent microtasks, both buffer into the same
map and the first finalize flush delivers them **mingled** — response B's
record data publishes before B's own request state transitions, which is
exactly the tear the buffering was built to prevent.

**Data / request-state skew.** Request states transition on promise hops
(a `.then` inside the request cache) and are stitched back to the
notification flush via a one-shot `_onNextFlush` callback. The coupling is
fragile and only covers the blocking-request path; everywhere else (bare
`store.push`, non-blocking priorities, the sync-render bypass) data and
request state publish at different instants.

**Lost notifications on teardown.** A notification buffered during a
transaction is silently dropped if the same transaction tears down its
subscriber (e.g. `deleteRecord` on a new record unloads it, unsubscribing the
legacy `RecordState` before the flush). Consumers work around this by
depending on *immediate* delivery, which is what blocks unifying the
policies. (This was surfaced concretely while removing the duplicate
relationship buffer in
[warp-drive#10992](https://github.com/warp-drive-data/warp-drive/pull/10992).)

### The expected outcome

* One documented delivery contract instead of five implicit ones.
* Synchronous APIs (`peekRecord`, `peekAll`, relationship access) can never
  observe a torn world: the buffer is provably empty at every yield point.
* Record data and request status for one response always publish in the same
  synchronous instant.
* Per-response batch isolation under concurrent requests.
* Deletion of the accidental machinery: `_enableAsyncFlush`, all explicit
  `_flush()` call sites, `_onNextFlush`, the relationships-only carve-out,
  and the `willSyncFlushWatchers` bypass.

## Detailed design

### Terminology

* **Transaction**: the synchronous unit of work in which store-managed state
  is written. An upgrade of the existing internal `store._run` / `store._join`
  mechanism; not a database-style transaction (no rollback).
* **Publication**: delivery of all notifications buffered during a
  transaction, in one synchronous batch at its close.

### The invariant

> Every write to store-managed state (cache content, graph edges, request
> lifecycle) happens inside a transaction. All notifications emitted during a
> transaction are delivered in one synchronous batch when the outermost
> transaction closes. The notification buffer is empty at every yield point.

Because delivery is always synchronous within the frame that performed the
writes, code outside the store can only ever execute in one of two states:
*before* a transaction (old cache, old memoization) or *after* one (new
cache, all signals invalidated) — both coherent. The "cache updated but
notifications pending" window that torn reads and interleaving bugs live in
becomes unrepresentable outside store internals.

### 1. Transactions: phase queues

The existing internal mechanism (`_run`/`_join`/`_schedule`) already defines
phases; this RFC upgrades its single-slot callbacks to queues and adds one
phase:

```
mutate → coalesce → sync → notify → cleanup
```

* `mutate` is the transaction body; `coalesce` and `sync` are the graph's
  existing remote/local settling phases, unchanged in role.
* `notify` drains the notification buffer **until empty**. A mutation
  performed by a subscriber during delivery joins the open transaction and
  lands in the same drain (with a dev-mode depth guard against subscriber
  ping-pong, replacing today's single-slot assertion).
* `cleanup` (new): record teardown, unsubscription, and identifier
  disconnect run here — strictly after delivery. This structurally fixes the
  lost-notification-on-teardown class: the world is told before things die.
* Nested transactions join the outermost one; only its close runs phases.

The internal shape of the transaction object is perf-sensitive (it wraps
every write in hot paths) and is left as an explicit unresolved question
below; the phase *semantics* above are the normative part.

### 2. NotificationManager: single buffer, single trigger, two-pass delivery

* The per-identifier, per-namespace, channel-aware buffer (as of
  warp-drive#10560 / #10992) is kept. The **only** flush trigger is the
  notify phase. A `notify()` call with no open transaction opens a degenerate
  one (precedent: `graph.push` already self-wraps in `_run` today).
* Delivery is **two-pass**: internal subscribers first (reactive records,
  record arrays, documents, request states — everything whose callback is
  signal invalidation), then external subscribers. After pass one, every
  memoized value is coherent, so even a synchronous read from inside a
  user's subscription callback sees a consistent world.
* Deleted: the immediate-flush path, `_enableAsyncFlush` coupling,
  `_onNextFlush`, the relationships-only deferral carve-out, and the
  `willSyncFlushWatchers()` check — nothing buffers across a yield, so there
  is nothing a synchronous watcher flush could miss.

The delivery contract, documented as public API:

> A notification emitted while you are subscribed is delivered to you exactly
> once, at the close of the emitting transaction, before any
> same-transaction teardown, always against a fully-settled cache.

### 3. Request state: transactionally-written, signals-backed

The `RequestStateService` is replaced by lazily-created, signal-backed state
records — per `RequestKey`, and per `ResourceKey` for mutations:

```ts
interface RequestState {
  status: 'pending' | 'fulfilled' | 'rejected' | 'aborted';
  isMutation: boolean;
  request: ImmutableRequestInfo;
  response: ResponseInfo | null;
  error: Error | null;
}
```

Transitions are plain writes performed **inside the owning transaction**:
`pending` at dispatch; `fulfilled`/`rejected` in the same transaction as
`put`/`didCommit`/`commitWasRejected`. The tear between record data and
`isSaving`/`isLoading` becomes unrepresentable because both are published by
the same flush. Reactive consumers do not subscribe at all — they read the
state and autotrack.

The exact public API shape for consuming these (and for the imperative
subscription escape hatch that replaces `subscribeForRecord`) is an
unresolved question below. The sunset path is not: `getRequestStateService`
and `subscribeForRecord` remain as a compatibility shim — an internal
pass-two subscriber replaying transitions to old callbacks — behind a
deprecation (id `warp-drive:deprecate-request-state-subscriptions`,
`until: 6.0`, gated by a build-config flag following the existing
`ENABLE_LEGACY_*` pattern).

### 4. Who owns the transaction (async paths)

Three cooperating layers:

| Layer | Role |
| --- | --- |
| **CacheManager** (floor) | Every cache write method (`put`, `didCommit`, `commitWasRejected`, `patch`, `mutate`, `upsert`, `setIsDeleted`, …) joins-or-opens a transaction. This guards against direct calls: a custom handler invoking `cache.put` bare still gets a single coherent publication. |
| **CacheHandler and the legacy network handler** (primary) | Each response-application frame opens one transaction spanning cache application, reactive document setup, `lifetimes.didRequest`, and the request-state transition. One publication per response — which also provides per-response isolation that today's shared finalize flush cannot. |
| **RequestManager** (sentinel) | It cannot own the transaction — the handler chain spans real async I/O and transactions are synchronous. Instead it writes the `pending` transition at dispatch, and at settle asserts (dev-mode) that a terminal transition was written — opening a fallback micro-transaction when a request bypassed the CacheHandler — and that the buffer is empty. |

The current finalize-time flush inside `store.request()` becomes a dev-mode
assertion that the buffer is already empty: the permanent proof that the
invariant holds.

### 5. Synchronous APIs

`store.push`, `createRecord`, `deleteRecord`, `unloadRecord`, `unloadAll`,
and graph mutations already run inside `_join`; they inherit the model with
no call-site changes. The bolt-ons are deleted: `_push` loses its
`asyncFlush` parameter, `unloadAll`'s hand-rolled flag/flush/pause-resume
becomes transaction + cleanup-phase work, and the forced flushes in legacy
relationship support are removed.

A public batching primitive falls out for free and may be exposed once the
internals stabilize:

```ts
store.batch(() => {
  store.push(payloadA);
  store.push(payloadB);
  record.name = 'Chris';
}); // one publication
```

### 6. Migration sequence

Each phase is independently shippable and behavior-gated by WarpDrive's
existing test matrix (`main-test-app`, graph, json-api, legacy, ember
framework suites):

1. **Instrumentation**: tag buffered notifications with a request id;
   demonstrate today's cross-request mingling.
2. **Phase queues + `cleanup`**; move teardown into it. Gate: the
   notify-then-unload scenario (the failure mode found in #10992) passes
   under full deferral.
3. **CacheManager floor**; `notify()` self-wraps; delete the
   relationships-only carve-out. Gate: `peekAll`/`peekRecord` agreement;
   bare-`cache.put` custom-handler test.
4. **Request state v2** + compat shim + deprecation. Gate: request-state
   suites; an `isSaving`-vs-data correlation test.
5. **Handler-owned transactions**; delete `_enableAsyncFlush` and all
   explicit flushes; finalize flush becomes an assertion. Gate: a
   two-concurrent-responses isolation test; the assertion stays silent
   across all suites.
6. **Two-pass delivery**; remove `willSyncFlushWatchers` from the
   NotificationManager; optionally expose `store.batch`.

Ordering constraints: (2) must precede (3) — the cleanup phase is what makes
full deferral sound; (4) must precede (5) — otherwise deleting the request
window reopens the data/request-state tear.

### Ecosystem implications

* **Deprecations**: `getRequestStateService` / `subscribeForRecord` (see §3);
  the `asyncFlush` parameter of `store._push` (intimate API).
* **Addon ecosystem**: custom `Cache` implementations and custom request
  handlers are the affected extension points; both get *stronger* guarantees
  with no interface change (the CacheManager floor wraps them). Addons that
  subscribe to notifications and depend on mid-mutation delivery timing will
  observe changes; the delivery contract in §2 becomes the documented
  guarantee.
* **Server-side rendering**: publication is always synchronous within the
  mutating frame, which is strictly friendlier to SSR than microtask-timed
  or scheduler-timed delivery.
* **Debuggability / Ember Inspector**: `LOG_NOTIFICATIONS` gains a stable
  story — every notification logs a buffer event and a publication event with
  a transaction id, replacing today's regime-dependent logs.
* Lint rules, blueprints, Engines, IDE support: no changes.

## How we teach this

The concept maps to vocabulary developers already have from databases and
other reactive systems: *writes happen in transactions; observers see
transaction boundaries, never intermediate states*. Teaching materials need
one new sentence more than they have today, and several fewer caveats:

* Guides: the "reactivity" section of the WarpDrive docs gains a short
  "when do observers see changes?" passage stating the delivery contract.
  Existing guidance about awaiting settled state is unchanged.
* API docs: `NotificationManager.subscribe` documents the contract in §2;
  the new request-state read APIs are documented alongside `getRequestState`
  usage they replace.
* Existing users are reached through the deprecation guide entry for
  `warp-drive:deprecate-request-state-subscriptions`, which shows the
  mechanical migration from `subscribeForRecord` callbacks to reading
  signals-backed request state.

No reorganization of the guides is required; this removes special cases
rather than adding concepts.

## Drawbacks

* **Notification timing is observable.** Ad-hoc attribute notifications move
  from mid-mutation to transaction close. Application tests that assert
  intermediate states, and addons that rely on immediate delivery, will
  notice. The phase-by-phase landing plan exists precisely to surface these
  in WarpDrive's own suites first.
* **Churn in intimate APIs.** Several semi-public internals
  (`getRequestStateService`, `_enableAsyncFlush`, forced `_flush()`) are load
  bearing in the wild despite their markings; the compatibility shim and
  deprecation window carry real maintenance cost until 6.0.
* **A transaction wrapper on every write is hot-path code.** If the
  internal shape is wrong, this trades a correctness problem for a
  performance one (see unresolved questions).

## Alternatives

* **Status quo**: keep five policies and continue patching consumers
  (the relationships-only carve-out shipped in warp-drive#10992 is exactly
  such a patch, and this RFC deletes it). The accidental complexity keeps
  compounding: #10560 had to make the now-removed duplicate buffer
  channel-aware precisely because the policies could not be unified.
* **Microtask-scheduled flushing** (deliver on the next microtask rather
  than at transaction close): simpler to implement, but reintroduces the
  torn-read window for synchronous APIs, breaks synchronous renderers, and
  makes SSR timing fragile. Rejected.
* **Per-namespace policies** (formalize "relationships defer, everything
  else is immediate"): preserves today's observable timing exactly, but
  hard-codes the very incoherence this RFC removes and leaves the
  request-window machinery intact. This is the shipped interim state, not
  the destination.
* **Prior art**: MobX (`runInAction`/transactions with reactions at action
  close), Vue (`nextTick`-batched effects), Solid (`batch()`), and Svelte 5
  (microtask-batched effects) all converge on "writes batch; observers see
  batch boundaries." The transaction-close (rather than microtask) timing
  here is what preserves WarpDrive's promise-resolution ordering guarantees.

## Unresolved questions

1. **Public API shape for reactive request subscriptions.** The
   signals-backed request state (§3) needs a consumer-facing read API — a
   `store.requestStateFor(keyOrRecord)` accessor, properties on
   `ReactiveDocument`, both, or something else — and a decision on whether
   any imperative subscription API survives beyond the deprecation shim.
   Strawman sketches exist but the shape should be settled during the
   Exploring stage with the Data team.
2. **The internal shape of the transaction.** Phase queues, the join
   fast-path, and buffer representation sit on the hottest write paths in
   the library. Options include a pooled transaction object, a monomorphic
   phase array, or retaining the current `_cbs`-style record with queues
   only where re-entrancy is possible. This needs benchmarks
   (notification-heavy push/mutation workloads) before the shape is fixed.
3. **Entanglement with the Render Aware Scheduler interface
   ([emberjs/rfcs#957](https://github.com/emberjs/rfcs/pull/957)).** That
   proposal makes promise interleaving safer by giving the framework a
   render-aware notion of when work flushes relative to the browser's event
   loop. If it lands, some guarantees this RFC achieves by *synchronous*
   publication (notably the sync-render bypass deletion, and how external
   pass-two subscribers are scheduled) could instead be expressed as
   scheduler lanes — potentially allowing external delivery to be deferred
   off the critical path without reopening the torn-read window. The two
   proposals should be kept explicitly compatible: this RFC's invariant is
   the stronger (synchronous) guarantee, and adopting #957 would relax only
   the *external* delivery pass, never the internal one.
4. **`store.batch` as public API**: name, whether it is sugar over the
   internal transaction or a distinct concept, and whether it may be opened
   during an active flush.
