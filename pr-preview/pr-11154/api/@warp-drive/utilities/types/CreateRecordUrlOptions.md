---
url: /pr-preview/pr-11154/api/@warp-drive/utilities/types/CreateRecordUrlOptions.md
---

# &#x20;CreateRecordUrlOptions

```ts
interface CreateRecordUrlOptions {
  host?: string;
  identifier: { type: string };
  namespace?: string;
  op: "createRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:288](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L288)

[buildBaseURL](../functions/buildBaseURL.md) options for a `createRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:309](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L309)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  type: string;
};
```

Defined in: [index.ts:296](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L296)

The type of the record being created.

#### type

```ts
type: string;
```

The resource type.

***

### namespace?

```ts
optional namespace?: string;
```

Defined in: [index.ts:313](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L313)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "createRecord";
```

Defined in: [index.ts:292](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L292)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:305](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/utilities/src/index.ts#L305)

The path segment for the resource, defaults to `identifier.type` if not provided.
