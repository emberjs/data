---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/utilities/json-api/types/JSONAPIConfig.md
description: >-
  Configuration for the JSON:API request builders: host, namespace, and the
  profile and extension URIs for `Accept`.
---

# &#x20;JSONAPIConfig

```ts
interface JSONAPIConfig extends BuildURLConfig {
  extensions?: { [key: string]: string | undefined; atomic?: string };
  host: string | null;
  namespace: string | null;
  profiles?: { [key: string]: string | undefined; pagination?: string };
}
```

Defined in: [-private/json-api/-utils.ts:13](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/json-api/-utils.ts#L13)

The configuration [setBuildURLConfig](../functions/setBuildURLConfig.md) accepts: the [BuildURLConfig](../../types/BuildURLConfig.md) fields, plus
the {json:api} profile and extension URIs to send in the `Accept` header.

## Extends

* [`BuildURLConfig`](../../types/BuildURLConfig.md)

## Properties

### extensions?

```ts
optional extensions?: {
  [key: string]: string | undefined;
  atomic?: string;
};
```

Defined in: [-private/json-api/-utils.ts:18](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/json-api/-utils.ts#L18)

#### Index Signature

```ts
[key: string]: string | undefined
```

#### atomic?

```ts
optional atomic?: string;
```

***

### host

```ts
host: string | null;
```

Defined in: [index.ts:26](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/index.ts#L26)

The scheme, domain and port (if any) to prefix built URLs with, e.g. `'https://api.example.com'`.

#### Inherited from

[`BuildURLConfig`](../../types/BuildURLConfig.md).[`host`](../../types/BuildURLConfig.md#host)

***

### namespace

```ts
namespace: string | null;
```

Defined in: [index.ts:30](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/index.ts#L30)

The path segment to insert between `host` and the resource path, e.g. `'api/v1'`.

#### Inherited from

[`BuildURLConfig`](../../types/BuildURLConfig.md).[`namespace`](../../types/BuildURLConfig.md#namespace)

***

### profiles?

```ts
optional profiles?: {
  [key: string]: string | undefined;
  pagination?: string;
};
```

Defined in: [-private/json-api/-utils.ts:14](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/utilities/src/-private/json-api/-utils.ts#L14)

#### Index Signature

```ts
[key: string]: string | undefined
```

#### pagination?

```ts
optional pagination?: string;
```
