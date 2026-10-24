---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/types/schema/fields/types/IdentityField.md
---

# &#x20;IdentityField

```ts
interface IdentityField {
  kind: "@id";
  name: string;
  sourceKey?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:298](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/schema/fields.ts#L298)

Represents a field whose value is the primary
key of the resource.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:304](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/schema/fields.ts#L304)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:312](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/schema/fields.ts#L312)

The name of the field that serves as the
primary key for the resource.

***

### sourceKey?

```ts
optional sourceKey?: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:334](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/schema/fields.ts#L334)

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
