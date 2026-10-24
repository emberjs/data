---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/schema/fields/types/DerivedField.md
---

# &#x20;DerivedField

```ts
interface DerivedField {
  kind: "derived";
  name: string;
  options?: ObjectValue;
  type: string;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:958](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L958)

Represents a field whose value is derived
from other fields in the schema.

The value is read-only, and is not stored
in the cache, nor is it sent to the server.

Usage of derived fields should be minimized
to scenarios where the derivation is known
to be safe. For instance, derivations that
required fields that are not always loaded
or that require access to related resources
that may not be loaded should be avoided.

## Properties

### kind

```ts
kind: "derived";
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:964](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L964)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:971](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L971)

The name of the field.

***

### options?

```ts
optional options?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1002](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L1002)

Options to pass to the derivation, if any

Must comply to the specific derivation's
options schema.

***

### type

```ts
type: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:992](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L992)

The name of the derivation to use.

Derivations are functions that take the
record, options, and the name of the field
as arguments, and return the derived value.

Derivations are memoized, and are only
recomputed when the fields they depend on
change.

Derivations are not stored in the cache,
and are not sent to the server.

Derivation functions must be explicitly
registered with the schema service.
