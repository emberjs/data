---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/utilities/types/FindRelatedResourceUrlOptions.md
description: >-
  Options passed to `buildBaseURL` to build the URL for a record's belongs-to
  relationship, ending in the field name.
---

# &#x20;FindRelatedResourceUrlOptions

```ts
interface FindRelatedResourceUrlOptions {
  fieldPath: string;
  host?: string;
  identifier: { id: string; type: string };
  namespace?: string;
  op: "findRelatedRecord";
  resourcePath?: string;
}
```

Defined in: [index.ts:262](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L262)

[buildBaseURL](../functions/buildBaseURL.md) options for a `findRelatedRecord` request.

## Properties

### fieldPath

```ts
fieldPath: string;
```

Defined in: [index.ts:283](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L283)

The relationship field name, appended to the resource path.

***

### host?

```ts
optional host?: string;
```

Defined in: [index.ts:291](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L291)

Overrides the globally configured host for this call only.

***

### identifier

```ts
identifier: {
  id: string;
  type: string;
};
```

Defined in: [index.ts:270](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L270)

The type and id of the record whose relationship is being fetched.

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

Defined in: [index.ts:295](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L295)

Overrides the globally configured namespace for this call only.

***

### op

```ts
op: "findRelatedRecord";
```

Defined in: [index.ts:266](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L266)

The request operation this URL is for.

***

### resourcePath?

```ts
optional resourcePath?: string;
```

Defined in: [index.ts:287](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/utilities/src/index.ts#L287)

The path segment for the resource, defaults to `identifier.type` if not provided.
