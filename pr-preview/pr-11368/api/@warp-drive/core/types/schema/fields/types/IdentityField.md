---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/schema/fields/types/IdentityField.md
description: >-
  Field schema of kind `@id` naming which field holds a resource's primary key,
  with an optional `sourceKey` when the API uses another name like `uuid`.
---

# &#x20;IdentityField

```ts
interface IdentityField {
  kind: "@id";
  name: string;
  sourceKey?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:326](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L326)

Represents a field whose value is the primary
key of the resource.

The [ResourceSchemas](/guides/the-manual/schemas/resources/) guide shows where it
sits in a schema.

This allows any field to serve as the primary
key while still being able to drive identity
needs within the system.

This is useful for resources that use for instance
'uuid', 'urn' or 'entityUrn' or 'primaryKey' as their
primary key field instead of 'id'.

## Properties

### kind

```ts
kind: "@id";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:332](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L332)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:340](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L340)

The name of the field that serves as the
primary key for the resource.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:362](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L362)

The name of the field as returned by the API
and inserted into the [Cache](../../../cache/types/Cache.md) if it differs
from [IdentityField.name](#name)

For instance, if the API returns:

```ts
{
  entityUrn: '324523-sadf34-345'
}
```

But the app desires to use `record.id; // '324523-sadf34-345'`

Then `name` would be set to `'id'` and
`sourceKey` would be set to `'entityUrn'`.

This option is only needed when the value differs from name.
