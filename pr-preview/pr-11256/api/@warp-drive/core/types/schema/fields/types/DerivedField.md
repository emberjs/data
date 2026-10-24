---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/schema/fields/types/DerivedField.md
description: >-
  Field schema of kind `derived` for a read-only, memoized value computed by a
  registered derivation and never cached or sent to the server.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1009](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/schema/fields.ts#L1009)

Represents a field whose value is derived
from other fields in the schema.

The [Derivations](/guides/the-manual/schemas/derivations) guide explains when to
use one and how to register its derivation.

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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1015](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/schema/fields.ts#L1015)

The kind of field this is.

***

### name

```ts
name: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1022](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/schema/fields.ts#L1022)

The name of the field.

***

### options?

```ts
optional options?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1053](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/schema/fields.ts#L1053)

Options to pass to the derivation, if any

Must comply to the specific derivation's
options schema.

***

### type

```ts
type: string;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:1043](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/schema/fields.ts#L1043)

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
