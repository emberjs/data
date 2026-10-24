---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/reactive/classes/SchemaService.md
description: >-
  The default schema service, which stores resource and object schemas, traits,
  derivations, transformations, hash functions and extensions registered at
  runtime.
---

# &#x20;SchemaService

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:704](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L704)

A SchemaService designed to work with dynamically registered schemas.

The [Schemas](/guides/the-manual/schemas/) guide shows how to register schemas
with it, and [Advanced Store Configuration](/guides/configuration/advanced#add-a-source-for-schema-for-your-data)
shows how to give a store one.

## Implements

* [`SchemaService`](../../types/schema/schema-service/types/SchemaService.md)

## Constructors

### Constructor

```ts
new SchemaService(): SchemaService;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:765](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L765)

#### Returns

`SchemaService`

## Methods

### ~~attributesDefinitionFor()~~&#x20;

```ts
attributesDefinitionFor(identifier: {
  type: string;
}): Record<string, LegacyAttributeField>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:706](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L706)

DEPRECATED - use `fields` instead

Returns definitions for all properties of the specified resource
that are considered "attributes". Generally these are properties
that are not related to book-keeping state on the client and do
not represent a linkage to another resource.

The return value should be a dictionary of key:value pairs
where the `key` is the attribute or property's name and `value`
is an object with at least the property `name` which should also
match `key`.

Optionally, this object may also specify `type`, which should
be a string reference to a `transform`, and `options` which
should be dictionary in which any key:value pairs are permissable.

For instance, when using `@warp-drive/legacy/model`, the following attribute
definition:

```ts
class extends Model {
  @attr('string', { defaultValue: 'hello' }) greeting;
  @attr('date') birthday;
  @attr firstName;
}
```

Would be returned as:

```js
{
  greeting: { name: 'greeting', type: 'string', options: { defaultValue: 'hello' } },
  birthday: { name: 'birthday', type: 'date' },
  firstName: { name: 'firstName' }
}
```

#### Parameters

##### identifier

###### type

`string`

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, [`LegacyAttributeField`](../../types/schema/fields/types/LegacyAttributeField.md)>

#### Deprecated

* use [fields](../../types/schema/schema-service/types/SchemaService.md#fields)

***

### cacheFields()

```ts
cacheFields(__namedParameters: {
  type: string;
}): Map<string, 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | ResourceField
  | CollectionField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
| LinksModeHasManyField>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1137](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1137)

Queries for the fields of a given resource type or resource identity.

Should error if the resource type is not recognized.

#### Parameters

##### \_\_namedParameters

###### type

`string`

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`,
| [`GenericField`](../../types/schema/fields/types/GenericField.md)
| [`ObjectField`](../../types/schema/fields/types/ObjectField.md)
| [`SchemaObjectField`](../../types/schema/fields/types/SchemaObjectField.md)
| [`ArrayField`](../../types/schema/fields/types/ArrayField.md)
| [`SchemaArrayField`](../../types/schema/fields/types/SchemaArrayField.md)
| [`ResourceField`](../../types/schema/fields/types/ResourceField.md)
| [`CollectionField`](../../types/schema/fields/types/CollectionField.md)
| [`LegacyAttributeField`](../../types/schema/fields/types/LegacyAttributeField.md)
| [`LegacyBelongsToField`](../../types/schema/fields/types/LegacyBelongsToField.md)
| [`LegacyHasManyField`](../../types/schema/fields/types/LegacyHasManyField.md)
| [`LinksModeBelongsToField`](../../types/schema/fields/types/LinksModeBelongsToField.md)
| [`LinksModeHasManyField`](../../types/schema/fields/types/LinksModeHasManyField.md)>

***

### CAUTION\_MEGA\_DANGER\_ZONE\_arrayExtensions()

```ts
CAUTION_MEGA_DANGER_ZONE_arrayExtensions(field: ExtensibleField): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1074](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1074)

Retrieve the extension map for an array field

#### Parameters

##### field

`ExtensibleField`

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, [`ExtensionDef`](../types/ExtensionDef.md)>
| `null`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_hasExtension()

```ts
CAUTION_MEGA_DANGER_ZONE_hasExtension(ext: {
  kind: "object" | "array";
  name: string;
}): boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1078](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1078)

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

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1067](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1067)

Retrieve the extension map for an object field

#### Parameters

##### field

`ExtensibleField`

##### resolvedType

`string` | `null`

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, [`ExtensionDef`](../types/ExtensionDef.md)>
| `null`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_registerExtension()

```ts
CAUTION_MEGA_DANGER_ZONE_registerExtension(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1052](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1052)

Register an extension for either objects or arrays

See also [CAUTION\_MEGA\_DANGER\_ZONE\_Extension](../types/CAUTION_MEGA_DANGER_ZONE_Extension.md)

#### Parameters

##### extension

[`CAUTION_MEGA_DANGER_ZONE_Extension`](../types/CAUTION_MEGA_DANGER_ZONE_Extension.md)

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

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1060](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1060)

Retrieve the extension map for a resource

#### Parameters

##### resource

| [`ResourceKey`](../../types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, [`ExtensionDef`](../types/ExtensionDef.md)>
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

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:810](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L810)

Returns the derivation registered with the name provided
by `field.type`. Validates that the field is a valid DerivedField.

#### Parameters

##### field

| [`DerivedField`](../../types/schema/fields/types/DerivedField.md)
| {
`type`: `string`;
}

#### Returns

[`Derivation`](../../types/schema/concepts/types/Derivation.md)

***

### ~~doesTypeExist()~~&#x20;

```ts
doesTypeExist(type: string): boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:705](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L705)

DEPRECATED - use `hasResource` instead

Queries whether the SchemaService recognizes `type` as a resource type

#### Parameters

##### type

`string`

#### Returns

`boolean`

#### Deprecated

* use [hasResource](../../types/schema/schema-service/types/SchemaService.md#hasresource)

***

### fields()

```ts
fields(__namedParameters: {
  type: string;
}): Map<string, FieldSchema>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1126](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1126)

Queries for the fields of a given resource type or resource identity.

Should error if the resource type is not recognized.

#### Parameters

##### \_\_namedParameters

###### type

`string`

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`FieldSchema`](../../types/schema/fields/types/FieldSchema.md)>

***

### hashFn()

```ts
hashFn(field: 
  | HashField
  | {
  type: string;
}): HashFn;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:827](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L827)

Returns the hash function registered with the name provided
by `field.type`. Validates that the field is a valid HashField.

#### Parameters

##### field

| [`HashField`](../../types/schema/fields/types/HashField.md)
| {
`type`: `string`;
}

#### Returns

[`HashFn`](../../types/schema/concepts/types/HashFn.md)

***

### hasResource()

```ts
hasResource(resource: {
  type: string;
}): boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1148](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1148)

Queries whether the SchemaService recognizes `type` as a resource type

#### Parameters

##### resource

###### type

`string`

#### Returns

`boolean`

***

### hasTrait()

```ts
hasTrait(type: string): boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:787](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L787)

Queries whether the SchemaService recognizes `type` as a resource trait

#### Parameters

##### type

`string`

#### Returns

`boolean`

***

### registerDerivation()

```ts
registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1048](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1048)

Enables registration of a derivation.

The derivation can later be retrieved by the name
attached to it's `[Type]` property.

#### Type Parameters

##### R

`R`

##### T

`T`

##### FM

`FM` *extends* [`ObjectValue`](../../types/json/raw/types/ObjectValue.md) | `null`

#### Parameters

##### derivation

[`Derivation`](../../types/schema/concepts/types/Derivation.md)<`R`, `T`, `FM`>

#### Returns

`void`

***

### registerHashFn()

```ts
registerHashFn<T extends object>(hashFn: HashFn<T>): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1122](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1122)

Registers a [HashFn](../../types/schema/concepts/types/HashFn.md) for use with a [HashField](../../types/schema/fields/types/HashField.md) for
either [ObjectSchema](../../types/schema/fields/types/ObjectSchema.md) identity or polymorphic type calculation.

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### hashFn

[`HashFn`](../../types/schema/concepts/types/HashFn.md)<`T`>

#### Returns

`void`

***

### registerResource()

```ts
registerResource(schema: 
  | ObjectSchema
  | ResourceSchema): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:853](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L853)

Enables registration of a single Schema representing either
a resource in PolarisMode or LegacyMode or an ObjectSchema
representing an embedded structure in other schemas.

This can be useful for either pre-loading schema information
or for registering schema information delivered by API calls
or other sources just-in-time.

#### Parameters

##### schema

| [`ObjectSchema`](../../types/schema/fields/types/ObjectSchema.md)
| [`ResourceSchema`](../../types/schema/fields/types/ResourceSchema.md)

#### Returns

`void`

***

### registerResources()

```ts
registerResources(schemas: (
  | ObjectSchema
  | ResourceSchema)[]): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:848](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L848)

Enables registration of multiple Schemas at once.

This can be useful for either pre-loading schema information
or for registering schema information delivered by API calls
or other sources just-in-time.

#### Parameters

##### schemas

(
| [`ObjectSchema`](../../types/schema/fields/types/ObjectSchema.md)
| [`ResourceSchema`](../../types/schema/fields/types/ResourceSchema.md))\[]

#### Returns

`void`

***

### registerTrait()

```ts
registerTrait(trait: Trait): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1036](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1036)

Registers a [Trait](../../types/schema/fields/types/Trait.md) for use by resource schemas.

Traits are re-usable collections of fields that can be composed to
build up a resource schema. Often they represent polymorphic behaviors
a resource should exhibit.

When we finalize a resource, we walk its traits and apply their fields
to the resource's fields. All specified traits must be registered by
this time or an error will be thrown.

Traits are applied left-to-right, with traits of traits being applied in the same
way. Thus for the most part, application of traits is a post-order graph traversal
problem.

A trait is only ever processed once. If multiple traits (A, B, C) have the same
trait (D) as a dependency, D will be included only once when first encountered by
A.

If a cycle exists such that trait A has trait B which has Trait A, trait A will
be applied *after* trait B in production. In development a cycle error will be thrown.

Fields are finalized on a "last wins principle". Thus traits appearing higher in
the tree and further to the right of a traits array take precedence, with the
resource's fields always being applied last and winning out.

#### Parameters

##### trait

[`Trait`](../../types/schema/fields/types/Trait.md)

#### Returns

`void`

***

### registerTransformation()

```ts
registerTransformation<T extends Value = string, PT = unknown>(transformation: Transformation<T, PT>): void;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:1044](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L1044)

Enables registration of a transformation.

The transformation can later be retrieved by the name
attached to it's `[Type]` property.

#### Type Parameters

##### T

`T` *extends* [`Value`](../../types/json/raw/types/Value.md) = `string`

##### PT

`PT` = `unknown`

#### Parameters

##### transformation

[`Transformation`](../types/Transformation.md)<`T`, `PT`>

#### Returns

`void`

***

### ~~relationshipsDefinitionFor()~~&#x20;

```ts
relationshipsDefinitionFor(identifier: {
  type: string;
}): Record<string, LegacyRelationshipField>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:707](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L707)

DEPRECATED - use `fields` instead

Returns definitions for all properties of the specified resource
that are considered "relationships". Generally these are properties
that represent a linkage to another resource.

The return value should be a dictionary of key:value pairs
where the `key` is the relationship or property's name and `value`
is an object with at least the following properties:

* `name` which should also match the `key` used in the dictionary.

* `kind` which should be either `belongsTo` or `hasMany`

* `type` which should be the related resource's string "type"

* `options` which should be a dictionary allowing any key but with
  at least the below keys present.

* `options.async` a boolean representing whether data for this relationship is
  typically loaded on-demand.

* `options.inverse` a string or null representing the field name / key of the
  corresponding relationship on the inverse resource.

Additionally the following options properties are optional. See [Polymorphic Relationships](https://rfcs.emberjs.com/id/0793-polymporphic-relations-without-inheritance)

* `options.polymorphic` a boolean representing whether multiple resource types
  can be used to satisfy this relationship.
* `options.as` a string representing the abstract type that the concrete side of
  a relationship must specify when fulfilling a polymorphic inverse.

For example, the following Model using @warp-drive/legacy/model would generate this relationships
definition by default:

```js
class User extends Model {
  @belongsTo('user', { async: false, inverse: null }) bestFriend;
  @hasMany('user', { async: true, inverse: 'friends' }) friends;
  @hasMany('pet', { async: false, polymorphic: true, inverse: 'owner' }) pets;
}
```

Which would be returned as

```js
{
  bestFriend: {
    name: 'bestFriend',
    kind: 'belongsTo',
    type: 'user',
    options: {
      async: false,
      inverse: null
    }
  },
  friends: {
    name: 'friends',
    kind: 'hasMany',
    type: 'user',
    options: {
      async: true,
      inverse: 'friends'
    }
  },
  pets: {
    name: 'pets',
    kind: 'hasMany',
    type: 'pet',
    options: {
      async: false,
      polymorphic: true,
      inverse: 'owner'
    }
  },
}
```

#### Parameters

##### identifier

###### type

`string`

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, [`LegacyRelationshipField`](../../types/schema/fields/types/LegacyRelationshipField.md)>

#### Deprecated

* use [fields](../../types/schema/schema-service/types/SchemaService.md#fields)

***

### resource()

```ts
resource(resource: 
  | ResourceKey
  | {
  type: string;
}): 
  | ObjectSchema
  | ResourceSchema;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:844](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L844)

Returns the schema for the provided resource type.

#### Parameters

##### resource

| [`ResourceKey`](../../types/identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

| [`ObjectSchema`](../../types/schema/fields/types/ObjectSchema.md)
| [`ResourceSchema`](../../types/schema/fields/types/ResourceSchema.md)

***

### resourceHasTrait()

```ts
resourceHasTrait(resource: 
  | ResourceKey
  | {
  type: string;
}, trait: string): boolean;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:790](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L790)

Queries whether the given resource has the given trait

#### Parameters

##### resource

| [`ResourceKey`](../../types/identifier/types/ResourceKey.md)
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

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:783](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L783)

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

Defined in: [warp-drive-packages/core/src/reactive/-private/schema.ts:793](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/reactive/-private/schema.ts#L793)

Returns the transformation registered with the name provided
by `field.type`. Validates that the field is a valid transformable.

#### Parameters

##### field

| [`GenericField`](../../types/schema/fields/types/GenericField.md)
| [`ObjectField`](../../types/schema/fields/types/ObjectField.md)
| [`ArrayField`](../../types/schema/fields/types/ArrayField.md)
| {
`type`: `string`;
}

#### Returns

[`Transformation`](../types/Transformation.md)
