---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/NotificationChannel.md
---

# &#x20;NotificationChannel

```ts
type NotificationChannel = "local" | "remote";
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:78](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L78)

A change to a resource's `attributes` or `relationships` can be relevant to
a "local" view of the resource (its mutable/editable state), a "remote" view
(its last-known-persisted state), or both.

Each view subscribes to its own channel and, when notified, re-pulls its own
projection of the data: a remote-only reader (e.g. PolarisMode's default
immutable record) subscribes `'remote'` and re-reads remote state; an
editable/reconciled reader (a legacy record, or an editable checkout)
subscribes `'local'` (the same as omitting the channel) and re-reads local
state. A notifier that knows which projection changed tags the notification
with that channel; each tag is delivered only to that channel's subscribers.
A change affecting both projections is either notified unscoped or once per
channel. An unscoped notify cannot guarantee which view changed, so it
reaches every subscriber -- this keeps every pre-channel `notify` callsite
(and any custom cache that doesn't know about channels) fully compatible.

The full delivery matrix:

| notify ↓ subscribe → | `'local'` | `'remote'` | omitted (= `'local'`) |
| -------------------- | --------- | ---------- | --------------------- |
| `'local'`            | ✅        | ❌         | ✅                    |
| `'remote'`           | ❌        | ✅         | ❌                    |
| omitted              | ✅        | ✅         | ✅                    |

Channel only applies to the `'attributes'` and `'relationships'`
notification types. All other types (`'errors'`,
`'identity'`, `'state'`, and the various `CacheOperation`/
`DocumentCacheOperation` values) are never filtered by channel since they
have no local/remote duality.
