---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/utilities/types/BuildURLConfig.md
description: >-
  The global `host` and `namespace` that `buildBaseURL` prefixes onto URLs when
  a call does not pass its own.
---

# &#x20;BuildURLConfig

```ts
interface BuildURLConfig {
  host: string | null;
  namespace: string | null;
}
```

Defined in: [index.ts:22](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L22)

The global configuration used by [buildBaseURL](../functions/buildBaseURL.md) when a call does
not provide its own `host`/`namespace`. Set via [setBuildURLConfig](../functions/setBuildURLConfig.md).

## Extended by

* [`JSONAPIConfig`](../json-api/types/JSONAPIConfig.md)

## Properties

### host

```ts
host: string | null;
```

Defined in: [index.ts:26](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L26)

The scheme, domain and port (if any) to prefix built URLs with, e.g. `'https://api.example.com'`.

***

### namespace

```ts
namespace: string | null;
```

Defined in: [index.ts:30](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/index.ts#L30)

The path segment to insert between `host` and the resource path, e.g. `'api/v1'`.
