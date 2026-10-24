---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/schema-dsl/types/ResourceOptions.md
description: >-
  Options for the `Resource` class decorator that select legacy-mode compilation
  and name the primary key property when no property uses `@id`.
---

# &#x20;ResourceOptions

```ts
interface ResourceOptions {
  identityField?: string;
  legacy?: boolean;
}
```

Defined in: [entities/resource.ts:19](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/schema-dsl/src/entities/resource.ts#L19)

Options accepted by the [Resource](../functions/Resource.md) decorator.

## Properties

### identityField?

```ts
optional identityField?: string;
```

Defined in: [entities/resource.ts:41](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/schema-dsl/src/entities/resource.ts#L41)

The name of the property that serves as this resource's primary key,
used only when no property on the class is decorated with [id](../functions/id.md).

Compiles to `identity: { kind: '@id', name: identityField }`. When
omitted (and no [id](../functions/id.md) is present), the identity defaults to
`{ kind: '@id', name: 'id' }`.

***

### legacy?

```ts
optional legacy?: boolean;
```

Defined in: [entities/resource.ts:29](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/schema-dsl/src/entities/resource.ts#L29)

Compiles the class to a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) for use with
`@warp-drive/legacy/model` instead of a [PolarisResourceSchema](../../core/types/schema/fields/types/PolarisResourceSchema.md).

Legacy resources omit the `$type` and `constructor` [DerivedField](../../core/types/schema/fields/types/DerivedField.md)s
that [Resource](../functions/Resource.md) otherwise adds automatically.
