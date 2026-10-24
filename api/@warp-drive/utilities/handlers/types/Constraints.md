---
url: >-
  https://canary.warp-drive.io/api/@warp-drive/utilities/handlers/types/Constraints.md
description: >-
  Minimum request body sizes, per body type, at which `AutoCompress` compresses
  a body.
---

# &#x20;Constraints

```ts
interface Constraints {
  ArrayBuffer?: number;
  Blob?: number;
  DataView?: number;
  String?: number;
  TypedArray?: number;
}
```

Defined in: [-private/handlers/auto-compress.ts:40](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L40)

The minimum body size, per body type, at which [AutoCompress](../classes/AutoCompress.md) compresses a request
body. Passed as [CompressionOptions.constraints](CompressionOptions.md#constraints).

## Properties

### ArrayBuffer?

```ts
ArrayBuffer?: number;
```

Defined in: [-private/handlers/auto-compress.ts:52](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L52)

The minimum size at which to compress array buffers

#### Default

```ts
1000
```

***

### Blob?

```ts
Blob?: number;
```

Defined in: [-private/handlers/auto-compress.ts:46](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L46)

The minimum size at which to compress blobs

#### Default

```ts
1000
```

***

### DataView?

```ts
DataView?: number;
```

Defined in: [-private/handlers/auto-compress.ts:64](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L64)

The minimum size at which to compress data views

#### Default

```ts
1000
```

***

### String?

```ts
String?: number;
```

Defined in: [-private/handlers/auto-compress.ts:70](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L70)

The minimum size at which to compress strings

#### Default

```ts
1000
```

***

### TypedArray?

```ts
TypedArray?: number;
```

Defined in: [-private/handlers/auto-compress.ts:58](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/utilities/src/-private/handlers/auto-compress.ts#L58)

The minimum size at which to compress typed arrays

#### Default

```ts
1000
```
