---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/utilities/types/DeleteRecordUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the URL for deleting an existing
  record by type and id.
---

# &#x20;DeleteRecordUrlOptions

```ts
interface DeleteRecordUrlOptions {
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "deleteRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:376](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/index.ts#L376)

[buildBaseURL](../functions/buildBaseURL.md) options for a `deleteRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:401](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/index.ts#L401)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:384](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/index.ts#L384)

The type and id of the record being deleted.

#### id

```ts
id: string;
```

The resource id.

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

Defined in: [index.ts:405](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/index.ts#L405)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "deleteRecord";
```

Defined in: [index.ts:380](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/index.ts#L380)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:397](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/utilities/src/index.ts#L397)

The path segment for the resource, defaults to `identifier.type` if not provided.
