---
url: https://canary.warp-drive.io/guides/the-manual/debugging.md
description: >-
  Enable WarpDrive's regionalized debug logging with `setWarpDriveLogging` at
  runtime or via build config, using flags such as LOG_REQUESTS, LOG_CACHE, and
  LOG_GRAPH.
---

# Debugging

WarpDrive ships with comprehensive instrumented logging throughout its internals. All instrumentation is **stripped from production builds** — enabling it has zero production cost.

Logging is regionalized by concern so you can enable only the areas relevant to your investigation.

## Quick Start

Open your browser's DevTools console and call:

```ts
setWarpDriveLogging({ LOG_REQUESTS: true, LOG_CACHE: true })
```

No import needed — the helper is attached to `globalThis` automatically.

## Runtime Activation

::: tip 💡 Works directly in browser DevTools
No import required. Config is preserved across page reloads via `sessionStorage`.
:::

```ts
setWarpDriveLogging({
  LOG_REQUESTS: true,
  LOG_CACHE: true,
  LOG_NOTIFICATIONS: true,
})
```

Settings persist for the current browser tab only. Open a new tab (or call the helper with the flag set to `false`) to reset.

## Build-time Activation

To enable logging by default in a dev environment, use the build config:

```ts
setConfig(__dirname, app, {
  debug: {
    LOG_REQUESTS: true,
    LOG_CACHE: true,
  }
});
```

All flags default to `false`. Runtime activation via [`setWarpDriveLogging`](/api/@warp-drive/core/build-config/debugging/#runtime-activation) overrides build-time values for the current tab.

## Log Flags

### Requests

| Flag | What it logs |
|------|-------------|
| [`LOG_REQUESTS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_REQUESTS) | All requests issued by the [RequestManager](/api/@warp-drive/core/classes/RequestManager) |
| [`LOG_REQUEST_STATUS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_REQUEST_STATUS) | Status updates for in-flight network requests |

### Cache

| Flag | What it logs |
|------|-------------|
| [`LOG_CACHE`](/api/@warp-drive/core/build-config/debugging/variables/LOG_CACHE) | All cache updates — both local and remote state |
| [`LOG_CACHE_POLICY`](/api/@warp-drive/core/build-config/debugging/variables/LOG_CACHE_POLICY) | Decisions made by the cache policy (e.g. whether to refetch) |
| [`LOG_NOTIFICATIONS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_NOTIFICATIONS) | Notifications received by the [NotificationManager](/api/@warp-drive/core/store/types/NotificationManager) |

### Relationships

| Flag | What it logs |
|------|-------------|
| [`LOG_GRAPH`](/api/@warp-drive/core/build-config/debugging/variables/LOG_GRAPH) | Updates to the relationship graph (pointer storage) |
| [`DEBUG_RELATIONSHIP_NOTIFICATIONS`](/api/@warp-drive/core/build-config/debugging/variables/DEBUG_RELATIONSHIP_NOTIFICATIONS) | Cause of change notifications when processing `hasMany` updates |

### Records & Identity

| Flag | What it logs |
|------|-------------|
| [`LOG_IDENTIFIERS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_IDENTIFIERS) | Peek, generation, and updates to Record Identifiers |
| [`LOG_INSTANCE_CACHE`](/api/@warp-drive/core/build-config/debugging/variables/LOG_INSTANCE_CACHE) | Creation and removal of RecordData and Record instances |

### Reactivity

| Flag | What it logs |
|------|-------------|
| [`LOG_REACT_SIGNAL_INTEGRATION`](/api/@warp-drive/core/build-config/debugging/variables/LOG_REACT_SIGNAL_INTEGRATION) | React-specific reactivity events |

### Performance

| Flag | What it logs |
|------|-------------|
| [`LOG_METRIC_COUNTS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_METRIC_COUNTS) | Key count metrics useful for performance profiling |

## Deprecated Flags

These flags were removed in v5.5. They have no effect — use `LOG_CACHE` instead.

| Removed flag | Replacement |
|---|---|
| [`LOG_MUTATIONS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_MUTATIONS) | `LOG_CACHE` |
| [`LOG_OPERATIONS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_OPERATIONS) | `LOG_CACHE` |
| [`LOG_PAYLOADS`](/api/@warp-drive/core/build-config/debugging/variables/LOG_PAYLOADS) | `LOG_CACHE` |

## API Reference

See [`@warp-drive/core/build-config/debugging`](/api/@warp-drive/core/build-config/debugging/) for the full API reference.
