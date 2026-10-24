---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/utilities/types/CreateRecordUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the collection URL a new record of a
  given type is saved to.
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

Defined in: [index.ts:304](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L304)

[buildBaseURL](../functions/buildBaseURL.md) options for a `createRecord` request.

## Properties

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:325](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L325)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  type: string;
};
```

Defined in: [index.ts:312](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L312)

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

Defined in: [index.ts:329](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L329)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "createRecord";
```

Defined in: [index.ts:308](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L308)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:321](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/utilities/src/index.ts#L321)

The path segment for the resource, defaults to `identifier.type` if not provided.
