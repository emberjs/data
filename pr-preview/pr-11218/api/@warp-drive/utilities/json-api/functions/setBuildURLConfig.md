---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/utilities/json-api/functions/setBuildURLConfig.md
description: >-
  Sets the JSON:API extensions and profiles sent in the `Accept` header, plus
  the global URL host and namespace.
---

# &#x20;setBuildURLConfig()

```ts
function setBuildURLConfig(config: JSONAPIConfig): void;
```

Defined in: [-private/json-api/-utils.ts:73](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/utilities/src/-private/json-api/-utils.ts#L73)

Allows setting extensions and profiles to be used in the `Accept` header.

Extensions and profiles are keyed by their namespace with the value being
their URI.

The [Basic Usage](/guides/the-manual/cookbook/basic-usage#step-2-configure-some-request-defaults)
guide uses it to configure a host, a namespace and a pagination profile.

Example:

```ts
setBuildURLConfig({
  extensions: {
    atomic: 'https://jsonapi.org/ext/atomic'
  },
  profiles: {
    pagination: 'https://jsonapi.org/profiles/ethanresnick/cursor-pagination'
  }
});
```

This also sets the global configuration for `buildBaseURL`
for host and namespace values for the global coniguration
done via `import { setBuildURLConfig } from '@warp-drive/utilities';`

These values may still be overridden by passing
them to buildBaseURL directly.

This method may be called as many times as needed

```ts
type BuildURLConfig = {
  host: string;
  namespace: string'
}
```

## Parameters

### config

[`JSONAPIConfig`](../types/JSONAPIConfig.md)

## Returns

`void`
