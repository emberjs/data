---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/types/ResourceOptions.md
---

# &#x20;ResourceOptions

```ts
interface ResourceOptions {
  identityField?: string;
  legacy?: boolean;
}
```

Defined in: [entities/resource.ts:17](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/entities/resource.ts#L17)

Options accepted by the [Resource](../functions/Resource.md) decorator.

## Properties

### identityField?

```ts
optional identityField?: string;
```

Defined in: [entities/resource.ts:39](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/entities/resource.ts#L39)

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

Defined in: [entities/resource.ts:27](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/entities/resource.ts#L27)

Compiles the class to a [LegacyResourceSchema](../../core/types/schema/fields/types/LegacyResourceSchema.md) for use with
`@warp-drive/legacy/model` instead of a [PolarisResourceSchema](../../core/types/schema/fields/types/PolarisResourceSchema.md).

Legacy resources omit the `$type` and `constructor` [DerivedField](../../core/types/schema/fields/types/DerivedField.md)s
that [Resource](../functions/Resource.md) otherwise adds automatically.
