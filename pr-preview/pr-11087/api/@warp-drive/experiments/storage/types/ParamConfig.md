---
url: /pr-preview/pr-11087/api/@warp-drive/experiments/storage/types/ParamConfig.md
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

Defined in: [storage/query-params.ts:9](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/storage/query-params.ts#L9)

Configuration options for fields that are also query parameters

## Properties

### deserialize

```ts
deserialize: (urlValue: string, instance: any) => unknown;
```

Defined in: [storage/query-params.ts:19](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/storage/query-params.ts#L19)

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

Defined in: [storage/query-params.ts:29](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/storage/query-params.ts#L29)

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

Defined in: [storage/query-params.ts:14](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/storage/query-params.ts#L14)

Convert a value into a string for storage in the URL.
`null` indicates the value should be omitted from the URL.

#### Parameters

##### value

`unknown`

##### instance

`any`

#### Returns

`string` | `null`
