---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/types/ModelSchema.md
---

# &#x20;ModelSchema\<T = `unknown`>

```ts
interface ModelSchema<T = unknown> {
  attributes: Map<KeyOrString<T>, LegacyAttributeField>;
  fields: Map<KeyOrString<T>, "belongsTo" | "hasMany" | "attribute">;
  modelName: T *extends* TypedRecordInstance ? TypeFromInstance<T> : string;
  relationshipsByName: Map<KeyOrString<T>, LegacyRelationshipField>;
  eachAttribute<K extends string>(callback: (this: ModelSchema<T>, key: K, attribute: LegacyAttributeField) => void, binding?: T): void;
  eachRelationship<K extends string>(callback: (this: ModelSchema<T>, key: K, relationship: LegacyRelationshipField) => void, binding?: T): void;
  eachTransformedAttribute<K extends string>(callback: (this: ModelSchema<T>, key: K, type: string | null) => void, binding?: T): void;
}
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:139](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L139)

Minimum subset of static schema methods and properties on the
"model" class.

Only used when using the legacy schema-service implementation
for @warp-drive/legacy/model or when wrapping schema for legacy
Adapters/Serializers.

## Type Parameters

### T

`T` = `unknown`

## Methods

### eachAttribute()

```ts
eachAttribute<K extends string>(callback: (this: ModelSchema<T>, key: K, attribute: LegacyAttributeField) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:167](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L167)

Invokes `callback` once for each attribute field defined on this resource
type, passing the attribute's key and schema.

#### Type Parameters

##### K

`K` *extends* `string`

#### Parameters

##### callback

(`this`: `ModelSchema`<`T`>, `key`: `K`, `attribute`: [`LegacyAttributeField`](../schema/fields/types/LegacyAttributeField.md)) => `void`

##### binding?

`T`

#### Returns

`void`

***

### eachRelationship()

```ts
eachRelationship<K extends string>(callback: (this: ModelSchema<T>, key: K, relationship: LegacyRelationshipField) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:176](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L176)

Invokes `callback` once for each relationship field defined on this
resource type, passing the relationship's key and schema.

#### Type Parameters

##### K

`K` *extends* `string`

#### Parameters

##### callback

(`this`: `ModelSchema`<`T`>, `key`: `K`, `relationship`: [`LegacyRelationshipField`](../schema/fields/types/LegacyRelationshipField.md)) => `void`

##### binding?

`T`

#### Returns

`void`

***

### eachTransformedAttribute()

```ts
eachTransformedAttribute<K extends string>(callback: (this: ModelSchema<T>, key: K, type: string | null) => void, binding?: T): void;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:186](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L186)

Invokes `callback` once for each attribute field defined on this resource
type that has a transform (a `type`), passing the attribute's key and the
name of the transform to apply.

#### Type Parameters

##### K

`K` *extends* `string`

#### Parameters

##### callback

(`this`: `ModelSchema`<`T`>, `key`: `K`, `type`: `string` | `null`) => `void`

##### binding?

`T`

#### Returns

`void`

## Properties

### attributes

```ts
attributes: Map<KeyOrString<T>, LegacyAttributeField>;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:155](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L155)

A map of every attribute field defined on this resource type, keyed by
attribute name.

***

### fields

```ts
fields: Map<KeyOrString<T>, "belongsTo" | "hasMany" | "attribute">;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:149](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L149)

A map of every field defined on this resource type to its kind
(`'attribute'`, `'belongsTo'`, or `'hasMany'`).

***

### modelName

```ts
modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:143](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L143)

The resource type (model name) that this schema describes.

***

### relationshipsByName

```ts
relationshipsByName: Map<KeyOrString<T>, LegacyRelationshipField>;
```

Defined in: [warp-drive-packages/core/src/store/deprecated/-private.ts:161](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/deprecated/-private.ts#L161)

A map of every relationship (`belongsTo`/`hasMany`) field defined on this
resource type, keyed by relationship name.
