---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/experiments/storage/types/ParamConfig.md
description: >-
  Experimental config passed to the `param` decorator that describes how a field
  is serialized to and parsed from a URL query parameter.
---

&#x20;

# &#x20;ParamConfig

```ts
interface ParamConfig {
  deserialize: (urlValue: string, instance: any) => unknown;
  getDefault?: (instance: any) => unknown;
  serialize: (value: unknown, instance: any) => string | null;
}
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:12](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/experiments/src/storage/query-params.ts#L12)

Configuration options for fields that are also query parameters

## Properties

### deserialize

```ts
deserialize: (urlValue: string, instance: any) => unknown;
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:22](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/experiments/src/storage/query-params.ts#L22)

Convert a string value from the URL back into
its original type

#### Parameters

##### urlValue

`string`

##### instance

`any`

#### Returns

`unknown`

***

### getDefault?

```ts
optional getDefault?: (instance: any) => unknown;
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:32](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/experiments/src/storage/query-params.ts#L32)

Get the default value for this param from the given instance.

If not present, the value passed to the field initializer
will be used as the default.

This should return the value in the field's native type,
not the serialized URL form.

#### Parameters

##### instance

`any`

#### Returns

`unknown`

***

### serialize

```ts
serialize: (value: unknown, instance: any) => string | null;
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:17](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/experiments/src/storage/query-params.ts#L17)

Convert a value into a string for storage in the URL.
`null` indicates the value should be omitted from the URL.

#### Parameters

##### value

`unknown`

##### instance

`any`

#### Returns

`string` | `null`
