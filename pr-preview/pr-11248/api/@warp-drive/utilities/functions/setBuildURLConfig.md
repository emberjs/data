---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/utilities/functions/setBuildURLConfig.md
description: >-
  Sets the app-wide default `host` and `namespace` used by `buildBaseURL` and
  the request builders.
---

# &#x20;setBuildURLConfig()

```ts
function setBuildURLConfig(config: BuildURLConfig): void;
```

Defined in: [index.ts:78](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/utilities/src/index.ts#L78)

Sets the global configuration for `buildBaseURL`
for host and namespace values for the application.

These values may still be overridden by passing
them to buildBaseURL directly.

The [Basic Usage](/guides/the-manual/cookbook/basic-usage#step-2-configure-some-request-defaults)
guide sets these defaults through the `@warp-drive/utilities/json-api` version of this function,
which also sets this global configuration.

This method may be called as many times as needed.
host values of `''` or `'/'` are equivalent.

Except for the value of `/` as host, host should not
end with `/`.

namespace should not start or end with a `/`.

```ts
type BuildURLConfig = {
  host: string;
  namespace: string'
}
```

Example:

```ts
import { setBuildURLConfig } from '@warp-drive/utilities';

setBuildURLConfig({
  host: 'https://api.example.com',
  namespace: 'api/v1'
});
```

## Parameters

### config

[`BuildURLConfig`](../types/BuildURLConfig.md)

## Returns

`void`
