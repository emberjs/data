---
url: /pr-preview/pr-11087/api/@warp-drive/utilities/functions/setBuildURLConfig.md
---

# &#x20;setBuildURLConfig()

```ts
function setBuildURLConfig(config: BuildURLConfig): void;
```

Defined in: [index.ts:71](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/utilities/src/index.ts#L71)

Sets the global configuration for `buildBaseURL`
for host and namespace values for the application.

These values may still be overridden by passing
them to buildBaseURL directly.

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
