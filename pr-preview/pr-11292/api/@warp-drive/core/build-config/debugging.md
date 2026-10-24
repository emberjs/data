---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/build-config/debugging.md
---

# Log Instrumentation&#x20;

Many portions of the internals are helpfully instrumented with logging.
This instrumentation is always removed from production builds.

Log instrumentation is "regionalized" to specific concepts and concerns
to enable you to enable/disable just the areas you are interested in.

To activate a particular group of logs set the appropriate flag to `true`
either in your build config or via the runtime helper.

## Runtime Activation

::: tip 💡 Just Works in browser Dev Tools!
No import is needed, and the logging config is preserved when the page is refreshed
:::

```ts
setWarpDriveLogging({
  LOG_CACHE: true,
  LOG_REQUESTS: true,
})
```

A runtime helper is attached to `globalThis` to enable activation of the logs
from anywhere in your application including from the devtools panel.

The runtime helper overrides any build config settings for the given flag
for the current browser tab. It stores the configuration you give it in
`sessionStorage` so that it persists across page reloads of the current tab,
but not across browser tabs or windows.

If you need to deactivate the logging, you can call the helper again with the
same flag set to `false` or just open a new tab/window.

## Buildtime Activation

```ts
setConfig(__dirname, app, {
  debug: {
    LOG_CACHE: true,
    LOG_REQUESTS: false,
    LOG_NOTIFICATIONS: true,
  }
});
```

The build config settings are used to set the default values for the
logging flags. Any logging flag that is not set in the build config
will default to `false`.

## Namespaces

* [t](namespaces/t/index.md)

## Variables

* [DEBUG\_RELATIONSHIP\_NOTIFICATIONS](variables/DEBUG_RELATIONSHIP_NOTIFICATIONS.md)
* [LOG\_CACHE](variables/LOG_CACHE.md)
* [LOG\_CACHE\_POLICY](variables/LOG_CACHE_POLICY.md)
* [LOG\_GRAPH](variables/LOG_GRAPH.md)
* [LOG\_IDENTIFIERS](variables/LOG_IDENTIFIERS.md)
* [LOG\_INSTANCE\_CACHE](variables/LOG_INSTANCE_CACHE.md)
* [LOG\_METRIC\_COUNTS](variables/LOG_METRIC_COUNTS.md)
* [~~LOG\_MUTATIONS~~](variables/LOG_MUTATIONS.md)
* [LOG\_NOTIFICATIONS](variables/LOG_NOTIFICATIONS.md)
* [~~LOG\_OPERATIONS~~](variables/LOG_OPERATIONS.md)
* [~~LOG\_PAYLOADS~~](variables/LOG_PAYLOADS.md)
* [LOG\_REACT\_SIGNAL\_INTEGRATION](variables/LOG_REACT_SIGNAL_INTEGRATION.md)
* [LOG\_REQUEST\_STATUS](variables/LOG_REQUEST_STATUS.md)
* [LOG\_REQUESTS](variables/LOG_REQUESTS.md)
