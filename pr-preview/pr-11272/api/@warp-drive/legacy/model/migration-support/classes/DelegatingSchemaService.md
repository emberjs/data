---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/model/migration-support/classes/DelegatingSchemaService.md
---

&#x20;

# &#x20;DelegatingSchemaService

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:557](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L557)

See the class documentation above for usage.

## Implements

* `SchemaService`

## Constructors

### Constructor

```ts
new DelegatingSchemaService(store: Store$1, schema: SchemaService): DelegatingSchemaService;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:583](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L583)

#### Parameters

##### store

`Store$1`

##### schema

`SchemaService`

#### Returns

`DelegatingSchemaService`

## Methods

### attributesDefinitionFor()?

```ts
optional attributesDefinitionFor(resource: 
  | ResourceKey
  | {
  type: string;
}): AttributesSchema;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:562](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L562)

Delegates to whichever of the primary/fallback schema services has a
schema for the resource, preferring the primary. See [isDelegated](#isdelegated).

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

`AttributesSchema`

***

### cacheFields()?

```ts
optional cacheFields(resource: {
  type: string;
}): Map<string, 
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField
  | LegacyAttributeField
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | ResourceField
| CollectionField>;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:621](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L621)

Queries for the fields of a given resource type or resource identity.

Should error if the resource type is not recognized.

#### Parameters

##### resource

###### type

`string`

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`,
| [`LegacyBelongsToField`](../../../../core/types/schema/fields/types/LegacyBelongsToField.md)
| [`LegacyHasManyField`](../../../../core/types/schema/fields/types/LegacyHasManyField.md)
| [`LinksModeBelongsToField`](../../../../core/types/schema/fields/types/LinksModeBelongsToField.md)
| [`LinksModeHasManyField`](../../../../core/types/schema/fields/types/LinksModeHasManyField.md)
| [`LegacyAttributeField`](../../../../core/types/schema/fields/types/LegacyAttributeField.md)
| [`GenericField`](../../../../core/types/schema/fields/types/GenericField.md)
| [`ObjectField`](../../../../core/types/schema/fields/types/ObjectField.md)
| [`SchemaObjectField`](../../../../core/types/schema/fields/types/SchemaObjectField.md)
| [`ArrayField`](../../../../core/types/schema/fields/types/ArrayField.md)
| [`SchemaArrayField`](../../../../core/types/schema/fields/types/SchemaArrayField.md)
| [`ResourceField`](../../../../core/types/schema/fields/types/ResourceField.md)
| [`CollectionField`](../../../../core/types/schema/fields/types/CollectionField.md)>

***

### CAUTION\_MEGA\_DANGER\_ZONE\_arrayExtensions()

```ts
CAUTION_MEGA_DANGER_ZONE_arrayExtensions(field: ExtensibleField): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:682](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L682)

Retrieve the extension map for an array field

#### Parameters

##### field

`ExtensibleField`

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, `ExtensionDef`>
| `null`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_hasExtension()

```ts
CAUTION_MEGA_DANGER_ZONE_hasExtension(ext: {
  kind: "object" | "array";
  name: string;
}): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:661](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L661)

Check if a specific extension has been registered previously

#### Parameters

##### ext

###### kind

`"object"` | `"array"`

###### name

`string`

#### Returns

`boolean`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_objectExtensions()

```ts
CAUTION_MEGA_DANGER_ZONE_objectExtensions(field: ExtensibleField, resolvedType: string | null): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:675](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L675)

Retrieve the extension map for an object field

#### Parameters

##### field

`ExtensibleField`

##### resolvedType

`string` | `null`

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, `ExtensionDef`>
| `null`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_registerExtension()

```ts
CAUTION_MEGA_DANGER_ZONE_registerExtension(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:665](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L665)

Register an extension for either objects or arrays

See also CAUTION\_MEGA\_DANGER\_ZONE\_Extension

#### Parameters

##### extension

`CAUTION_MEGA_DANGER_ZONE_Extension`

#### Returns

`void`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_resourceExtensions()

```ts
CAUTION_MEGA_DANGER_ZONE_resourceExtensions(resource: 
  | ResourceKey
  | {
  type: string;
}): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:669](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L669)

Retrieve the extension map for a resource

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, `ExtensionDef`>
| `null`

***

### derivation()

```ts
derivation(field: 
  | DerivedField
  | {
  type: string;
}): Derivation;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:636](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L636)

Returns the derivation registered with the name provided
by `field.type`. Validates that the field is a valid DerivedField.

#### Parameters

##### field

| [`DerivedField`](../../../../core/types/schema/fields/types/DerivedField.md)
| {
`type`: `string`;
}

#### Returns

[`Derivation`](../../../../core/types/schema/concepts/types/Derivation.md)

***

### doesTypeExist()?

```ts
optional doesTypeExist(type: string): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:572](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L572)

Whether either the primary or fallback schema service has a schema
for the given type.

#### Parameters

##### type

`string`

#### Returns

`boolean`

***

### fields()

```ts
fields(resource: 
  | ResourceKey
  | {
  type: string;
}): Map<string, FieldSchema>;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:615](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L615)

Queries for the fields of a given resource type or resource identity.

Should error if the resource type is not recognized.

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`FieldSchema`](../../../../core/types/schema/fields/types/FieldSchema.md)>

***

### hashFn()

```ts
hashFn(field: 
  | HashField
  | {
  type: string;
}): HashFn;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:633](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L633)

Returns the hash function registered with the name provided
by `field.type`. Validates that the field is a valid HashField.

#### Parameters

##### field

| [`HashField`](../../../../core/types/schema/fields/types/HashField.md)
| {
`type`: `string`;
}

#### Returns

[`HashFn`](../../../../core/types/schema/concepts/types/HashFn.md)

***

### hasResource()

```ts
hasResource(resource: 
  | ResourceKey
  | {
  type: string;
}): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:600](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L600)

Queries whether the SchemaService recognizes `type` as a resource type

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

`boolean`

***

### hasTrait()

```ts
hasTrait(type: string): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:603](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L603)

Queries whether the SchemaService recognizes `type` as a resource trait

#### Parameters

##### type

`string`

#### Returns

`boolean`

***

### isDelegated()

```ts
isDelegated(resource: 
  | ResourceKey
  | {
  type: string;
}): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:592](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L592)

Whether the given resource's schema is being served by the fallback
(legacy Model-derived) schema service rather than the primary one.

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

`boolean`

***

### registerDerivation()

```ts
registerDerivation<R, T, FM extends 
  | ObjectValue
  | null>(derivation: Derivation<R, T, FM>): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:654](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L654)

Enables registration of a derivation.

The derivation can later be retrieved by the name
attached to it's `[Type]` property.

#### Type Parameters

##### R

`R`

##### T

`T`

##### FM

`FM` *extends*
| [`ObjectValue`](../../../../core/types/json/raw/types/ObjectValue.md)
| `null`

#### Parameters

##### derivation

[`Derivation`](../../../../core/types/schema/concepts/types/Derivation.md)<`R`, `T`, `FM`>

#### Returns

`void`

***

### registerHashFn()

```ts
registerHashFn(hashFn: HashFn): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:657](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L657)

Enables registration of a hashing function

The hashing function can later be retrieved by the name
attached to it's `[Type]` property.

#### Parameters

##### hashFn

[`HashFn`](../../../../core/types/schema/concepts/types/HashFn.md)

#### Returns

`void`

***

### registerResource()

```ts
registerResource(schema: 
  | ResourceSchema
  | ObjectSchema): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:648](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L648)

Enables registration of a single Schema representing either
a resource in PolarisMode or LegacyMode or an ObjectSchema
representing an embedded structure in other schemas.

This can be useful for either pre-loading schema information
or for registering schema information delivered by API calls
or other sources just-in-time.

#### Parameters

##### schema

| [`ResourceSchema`](../../../../core/types/schema/fields/types/ResourceSchema.md)
| [`ObjectSchema`](../../../../core/types/schema/fields/types/ObjectSchema.md)

#### Returns

`void`

***

### registerResources()

```ts
registerResources(schemas: (
  | ResourceSchema
  | ObjectSchema)[]): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:645](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L645)

Enables registration of multiple Schemas at once.

This can be useful for either pre-loading schema information
or for registering schema information delivered by API calls
or other sources just-in-time.

#### Parameters

##### schemas

(
| [`ResourceSchema`](../../../../core/types/schema/fields/types/ResourceSchema.md)
| [`ObjectSchema`](../../../../core/types/schema/fields/types/ObjectSchema.md))\[]

#### Returns

`void`

***

### registerTransformation()

```ts
registerTransformation(transform: Transformation): void;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:651](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L651)

Enables registration of a transformation.

The transformation can later be retrieved by the name
attached to it's `[Type]` property.

#### Parameters

##### transform

[`Transformation`](../../../../core/types/schema/concepts/types/Transformation.md)

#### Returns

`void`

***

### relationshipsDefinitionFor()?

```ts
optional relationshipsDefinitionFor(resource: 
  | ResourceKey
  | {
  type: string;
}): RelationshipsSchema;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:567](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L567)

Delegates to whichever of the primary/fallback schema services has a
schema for the resource, preferring the primary. See [isDelegated](#isdelegated).

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

`RelationshipsSchema`

***

### resource()

```ts
resource(resource: 
  | ResourceKey
  | {
  type: string;
}): 
  | ResourceSchema
  | ObjectSchema;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:639](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L639)

Returns the schema for the provided resource type.

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

| [`ResourceSchema`](../../../../core/types/schema/fields/types/ResourceSchema.md)
| [`ObjectSchema`](../../../../core/types/schema/fields/types/ObjectSchema.md)

***

### resourceHasTrait()

```ts
resourceHasTrait(resource: 
  | ResourceKey
  | {
  type: string;
}, trait: string): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:609](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L609)

Queries whether the given resource has the given trait

#### Parameters

##### resource

| [`ResourceKey`](../../../../core/types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

##### trait

`string`

#### Returns

`boolean`

***

### resourceTypes()

```ts
resourceTypes(): readonly string[];
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:596](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L596)

Returns all known resource types

#### Returns

readonly `string`\[]

***

### transformation()

```ts
transformation(field: 
  | GenericField
  | ObjectField
  | ArrayField
  | {
  type: string;
}): Transformation;
```

Defined in: [warp-drive-packages/legacy/src/model/migration-support.ts:630](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/migration-support.ts#L630)

Returns the transformation registered with the name provided
by `field.type`. Validates that the field is a valid transformable.

#### Parameters

##### field

| [`GenericField`](../../../../core/types/schema/fields/types/GenericField.md)
| [`ObjectField`](../../../../core/types/schema/fields/types/ObjectField.md)
| [`ArrayField`](../../../../core/types/schema/fields/types/ArrayField.md)
| {
`type`: `string`;
}

#### Returns

[`Transformation`](../../../../core/types/schema/concepts/types/Transformation.md)
