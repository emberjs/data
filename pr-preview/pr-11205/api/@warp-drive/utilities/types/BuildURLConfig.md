---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/utilities/types/BuildURLConfig.md
---

# &#x20;BuildURLConfig

```ts
interface BuildURLConfig {
  host: string | null;
  namespace: string | null;
}
```

Defined in: [index.ts:20](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L20)

The global configuration used by [buildBaseURL](../functions/buildBaseURL.md) when a call does
not provide its own `host`/`namespace`. Set via [setBuildURLConfig](../functions/setBuildURLConfig.md).

## Properties

### host

```ts
host: string | null;
```

Defined in: [index.ts:24](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L24)

The scheme, domain and port (if any) to prefix built URLs with, e.g. `'https://api.example.com'`.

***

### namespace

```ts
namespace: string | null;
```

Defined in: [index.ts:28](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/utilities/src/index.ts#L28)

The path segment to insert between `host` and the resource path, e.g. `'api/v1'`.
