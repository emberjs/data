---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/rfcs/0009-deprecate-request-state-subscriptions.md
description: >-
  Proposes deprecating the imperative RequestStateService subscription API in
  favor of the signals-backed reactive request state introduced by RFC 0001,
  with removal targeted for 6.0.
---

# Deprecating Subscription-Based Request State&#x20;

## Summary

The imperative request-state API — `store.getRequestStateService()` and the subscription and
lookup methods it exposes (`subscribeForRecord`, `getPendingRequestsForRecord`,
`getLastRequestForRecord`) — is deprecated in favor of the signals-backed reactive request state
introduced by [RFC 0001, Transactional Notification Delivery and Reactive Request
State](./0001-warp-drive-transactional-notifications.md). Consumers read request state and
autotrack it instead of registering callbacks. Removal from publishing is targeted for 6.0.

This deprecation is deliberately **separate from, and sequenced after, RFC 0001**. RFC 0001
proposes the replacement; this RFC deprecates the old surface, and its deprecation flag is only
enabled once that replacement has shipped and reached the Recommended stage — the point at which
the reactive API is the one we steer people toward. Until then this RFC documents the intent and
the migration, but nothing is deprecated.

## Motivation

RFC 0001 rebuilds request state as lazily-created, signals-backed data written inside the same
transaction that applies a response's cache changes. Reactive consumers read that state directly
and autotrack it; there is no callback to register and no flush to coordinate against. That makes
the subscription API redundant, and redundant in a way that is actively worse for correctness:

* **Subscriptions observe a different timeline than the data they describe.** The subscription
  API fires on promise hops, stitched to the notification flush by a one-shot internal callback.
  RFC 0001 removes that coupling; keeping the subscription API would mean maintaining the exact
  data/request-state skew RFC 0001 exists to eliminate.
* **Callbacks are strictly more error-prone than autotracking.** A subscriber must be unsubscribed
  to avoid leaks and must reconcile its own view of "is this request still current." Reading
  signals-backed state has neither hazard: consumers read the current value and the framework
  invalidates them.
* **One surface, one contract.** Leaving two ways to observe request state — one reactive, one
  callback-based, with different timing — is the kind of accidental multiplicity the reactive
  layer is trying to retire.

## Detailed design

### What is deprecated

The following become deprecated once the flag below is enabled:

* `store.getRequestStateService()` and the service instance it returns.
* That service's `subscribeForRecord(identifier, callback)`.
* Its imperative lookups `getPendingRequestsForRecord(identifier)` and
  `getLastRequestForRecord(identifier)`.

### Deprecation flag

* **id**: `warp-drive:deprecate-request-state-subscriptions`
* **since**: the first 5.x minor in which RFC 0001's reactive request state is **Recommended**
  (not merely shipped). This ordering is a hard precondition — see below.
* **until**: `6.0`
* Gated by a build-config flag following the existing `ENABLE_LEGACY_*` pattern in
  `deprecations.ts`, so apps can opt into the removed-code build once migrated.

### Sequencing constraint

The flag must not be enabled before the reactive replacement is Recommended. Enabling a
deprecation whose replacement is not yet the recommended path would warn users toward an API that
is still stabilizing. Concretely, this RFC may be Accepted independently, but the PR that flips
`since` from a placeholder to a concrete version, and enables the warning, lands only after RFC
0001's reactive request state has reached Recommended. This is the general rule captured in the
[Writing and Implementing RFCs](/skills/contributors/writing-and-implementing-rfcs.md) skill:
deprecations follow the features that replace them.

### Migration

The mapping is mechanical for the common cases:

```ts
// Before: imperative subscription
const requests = store.getRequestStateService();
const token = requests.subscribeForRecord(identifier, (state) => {
  if (state.type === 'mutation' && state.state === 'fulfilled') {
    // react to save completion
  }
});
// ...later
// (consumer is responsible for teardown)
```

```ts
// After: read signals-backed request state and autotrack it
import { getRequestState } from '@warp-drive/core/reactive'; // exact import per RFC 0001

const state = getRequestState(identifier);
// read state.status / state.isMutation / state.error in a tracked context;
// the framework invalidates readers when it changes. No token, no teardown.
```

The precise public read API is being settled in RFC 0001 (an open question there); this RFC's
migration guidance will name the final import and shape once RFC 0001 resolves it, before this
deprecation's warning is enabled.

### Ecosystem implications

* **Addon ecosystem**: addons that consume `getRequestStateService` are the affected surface.
  They migrate to the reactive read API on the same timeline.
* **Ember Inspector / DevTools**: any request-state panel that reads via the subscription API
  moves to the reactive source; behavior for users is unchanged.
* **Lint rules**: an `eslint-plugin-warp-drive` rule flagging `getRequestStateService` usage,
  with an autofix to the reactive API where the callback body maps cleanly, is a possible
  follow-up but is not required by this RFC.
* Blueprints, Engines, SSR, IDE support: no changes.

## How we teach this

* A deprecation guide entry for `warp-drive:deprecate-request-state-subscriptions` with the
  before/after above and the teardown-hazard explanation, cross-linked from RFC 0001's teaching
  guide (which introduces the reactive request state this points at).
* The API docs for `getRequestStateService` and its methods gain a deprecation notice pointing at
  the reactive read API.
* No guide reorganization: the reactive request-state guide is introduced by RFC 0001; this entry
  only adds the "migrating off the old subscription API" section to it.

## Drawbacks

* **Churn for an intimate-but-used API.** `getRequestStateService` is public and has real
  consumers despite its low profile; the deprecation window and migration carry a maintenance
  cost until 6.0.
* **Two-RFC coordination.** Splitting this out of RFC 0001 (per review feedback) means the
  deprecation's concrete `since` cannot be fixed until RFC 0001 is Recommended, so this RFC
  carries a placeholder version longer than a self-contained deprecation would.

## Alternatives

* **Keep the subscription API indefinitely as a thin shim over the reactive state.** RFC 0001
  already describes a compatibility shim (an internal reactive subscriber replaying transitions
  to old callbacks) to avoid a hard break. This RFC's position is that the shim is a *migration
  aid with an end date*, not a permanent second API; keeping it forever preserves the
  dual-surface problem this deprecation exists to remove.
* **Fold this back into RFC 0001.** Rejected: it couples the deprecation timeline to the feature
  and mixes two independent decisions in one proposal — the specific concern raised in review of
  emberjs/rfcs#1236.

## Unresolved questions

1. The concrete `since` version, which cannot be fixed until RFC 0001's reactive request state
   reaches Recommended.
2. Whether an `eslint-plugin-warp-drive` autofix rule ships alongside the deprecation or as a
   later convenience.
3. The final import path and read-API shape referenced in the migration examples, inherited from
   RFC 0001's corresponding open question.
