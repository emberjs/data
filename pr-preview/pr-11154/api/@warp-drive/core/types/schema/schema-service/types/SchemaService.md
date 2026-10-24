---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/schema-service/types/SchemaService.md
---

# &#x20;SchemaService

```ts
interface SchemaService {
  attributesDefinitionFor?(key: 
  | ResourceKey
  | ObjectWithStringTypeProperty): AttributesSchema;
  cacheFields?(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): Map<string, 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField
  | ResourceField
  | CollectionField>;
  CAUTION_MEGA_DANGER_ZONE_arrayExtensions?(field: ExtensibleField): 
  | Map<string | symbol, ExtensionDef>
  | null;
  CAUTION_MEGA_DANGER_ZONE_hasExtension?(ext: { kind: "object" | "array"; name: string }): boolean;
  CAUTION_MEGA_DANGER_ZONE_objectExtensions?(field: ExtensibleField, resolvedType: string | null): 
  | Map<string | symbol, ExtensionDef>
  | null;
  CAUTION_MEGA_DANGER_ZONE_registerExtension?(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void;
  CAUTION_MEGA_DANGER_ZONE_resourceExtensions?(resource: 
  | ResourceKey
  | {
  type: string;
}): 
  | Map<string | symbol, ExtensionDef>
  | null;
  derivation(field: 
  | DerivedField
  | ObjectWithStringTypeProperty): Derivation;
  doesTypeExist?(type: string): boolean;
  fields(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): Map<string, FieldSchema>;
  hashFn(field: 
  | HashField
  | ObjectWithStringTypeProperty): HashFn;
  hasResource(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): boolean;
  hasTrait(type: string): boolean;
  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void;
  registerHashFn(hashFn: HashFn): void;
  registerResource(schema: Schema): void;
  registerResources(schemas: Schema[]): void;
  registerTrait?(trait: Trait): void;
  registerTransformation(transform: Transformation): void;
  relationshipsDefinitionFor?(key: 
  | ResourceKey
  | ObjectWithStringTypeProperty): RelationshipsSchema;
  resource(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): Schema;
  resourceHasTrait(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty, trait: string): boolean;
  resourceTypes(): readonly string[];
  transformation(field: 
  | GenericField
  | ObjectField
  | ArrayField
  | ObjectWithStringTypeProperty): Transformation;
}
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:92](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L92)

The SchemaService provides the ability to query for information about the structure
of any resource type.

Applications can provide any implementation of the SchemaService they please so long
as it conforms to this interface.

The design of the service means that schema information could be lazily populated,
derived-on-demand, or progressively enhanced during the course of an application's runtime.
The primary requirement is merely that any information the service needs to correctly
respond to an inquest is available by the time it is asked.

The `@warp-drive/legacy/model` package provides an implementation of this service which
makes use of your model classes as the source of information to respond to queries
about resource schema. While this is useful, this may not be ideal for your application.
For instance, Schema information could be sideloaded or pre-flighted for API calls,
resulting in no need to bundle and ship potentially large and expensive JSON
or large Javascript based Models to pull information from.

To register a custom schema implementation, implement the store's `createSchemaService`
hook to return an instance of your service.

```ts
import { Store } from '@warp-drive/core';
import CustomSchemas from './custom-schemas';

export default class extends Store {
  createSchemaService() {
    return new CustomSchemas();
  }
}
```

At runtime, both the `Store` and the `CacheCapabilitiesManager` provide
access to this service via the `schema` property.

```ts
export default class extends Component {
 @service store;

 get fields() {
   return this.store
     .schema
     .fields(this.args.dataType);
 }
}
```

## Methods

### ~~attributesDefinitionFor()?~~&#x20;

```ts
optional attributesDefinitionFor(key: 
  | ResourceKey
  | ObjectWithStringTypeProperty): AttributesSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:300](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L300)

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

##### key

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`AttributesSchema`](AttributesSchema.md)

#### Deprecated

* use [fields](#fields)

***

### cacheFields()?

```ts
optional cacheFields(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): Map<string, 
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField
  | ResourceField
| CollectionField>;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:140](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L140)

Queries for the fields of a given resource type or resource identity.

Should error if the resource type is not recognized.

#### Parameters

##### resource

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`,
| [`GenericField`](../../fields/types/GenericField.md)
| [`ObjectField`](../../fields/types/ObjectField.md)
| [`SchemaObjectField`](../../fields/types/SchemaObjectField.md)
| [`ArrayField`](../../fields/types/ArrayField.md)
| [`SchemaArrayField`](../../fields/types/SchemaArrayField.md)
| [`LegacyAttributeField`](../../fields/types/LegacyAttributeField.md)
| [`LegacyBelongsToField`](../../fields/types/LegacyBelongsToField.md)
| [`LegacyHasManyField`](../../fields/types/LegacyHasManyField.md)
| [`LinksModeBelongsToField`](../../fields/types/LinksModeBelongsToField.md)
| [`LinksModeHasManyField`](../../fields/types/LinksModeHasManyField.md)
| [`ResourceField`](../../fields/types/ResourceField.md)
| [`CollectionField`](../../fields/types/CollectionField.md)>

***

### CAUTION\_MEGA\_DANGER\_ZONE\_arrayExtensions()?

```ts
optional CAUTION_MEGA_DANGER_ZONE_arrayExtensions(field: ExtensibleField): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:422](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L422)

Retrieve the extension map for an array field

#### Parameters

##### field

`ExtensibleField`

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, [`ExtensionDef`](../../../../reactive/types/ExtensionDef.md)>
| `null`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_hasExtension()?

```ts
optional CAUTION_MEGA_DANGER_ZONE_hasExtension(ext: {
  kind: "object" | "array";
  name: string;
}): boolean;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:429](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L429)

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

### CAUTION\_MEGA\_DANGER\_ZONE\_objectExtensions()?

```ts
optional CAUTION_MEGA_DANGER_ZONE_objectExtensions(field: ExtensibleField, resolvedType: string | null): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:412](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L412)

Retrieve the extension map for an object field

#### Parameters

##### field

`ExtensibleField`

##### resolvedType

`string` | `null`

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, [`ExtensionDef`](../../../../reactive/types/ExtensionDef.md)>
| `null`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_registerExtension()?

```ts
optional CAUTION_MEGA_DANGER_ZONE_registerExtension(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:396](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L396)

Register an extension for either objects or arrays

See also [CAUTION\_MEGA\_DANGER\_ZONE\_Extension](../../../../reactive/types/CAUTION_MEGA_DANGER_ZONE_Extension.md)

#### Parameters

##### extension

[`CAUTION_MEGA_DANGER_ZONE_Extension`](../../../../reactive/types/CAUTION_MEGA_DANGER_ZONE_Extension.md)

#### Returns

`void`

***

### CAUTION\_MEGA\_DANGER\_ZONE\_resourceExtensions()?

```ts
optional CAUTION_MEGA_DANGER_ZONE_resourceExtensions(resource: 
  | ResourceKey
  | {
  type: string;
}): 
  | Map<string | symbol, ExtensionDef>
  | null;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:403](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L403)

Retrieve the extension map for a resource

#### Parameters

##### resource

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| {
`type`: `string`;
}

#### Returns

| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string` | `symbol`, [`ExtensionDef`](../../../../reactive/types/ExtensionDef.md)>
| `null`

***

### derivation()

```ts
derivation(field: 
  | DerivedField
  | ObjectWithStringTypeProperty): Derivation;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:166](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L166)

Returns the derivation registered with the name provided
by `field.type`. Validates that the field is a valid DerivedField.

#### Parameters

##### field

| [`DerivedField`](../../fields/types/DerivedField.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`Derivation`](../../concepts/types/Derivation.md)

***

### ~~doesTypeExist()?~~&#x20;

```ts
optional doesTypeExist(type: string): boolean;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:101](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L101)

DEPRECATED - use `hasResource` instead

Queries whether the SchemaService recognizes `type` as a resource type

#### Parameters

##### type

`string`

#### Returns

`boolean`

#### Deprecated

* use [hasResource](#hasresource)

***

### fields()

```ts
fields(resource: 
  | ResourceKey
| ObjectWithStringTypeProperty): Map<string, FieldSchema>;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:131](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L131)

Queries for the fields of a given resource type or resource identity.

Should error if the resource type is not recognized.

#### Parameters

##### resource

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`FieldSchema`](../../fields/types/FieldSchema.md)>

***

### hashFn()

```ts
hashFn(field: 
  | HashField
  | ObjectWithStringTypeProperty): HashFn;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:158](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L158)

Returns the hash function registered with the name provided
by `field.type`. Validates that the field is a valid HashField.

#### Parameters

##### field

| [`HashField`](../../fields/types/HashField.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`HashFn`](../../concepts/types/HashFn.md)

***

### hasResource()

```ts
hasResource(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): boolean;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:108](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L108)

Queries whether the SchemaService recognizes `type` as a resource type

#### Parameters

##### resource

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

#### Returns

`boolean`

***

### hasTrait()

```ts
hasTrait(type: string): boolean;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:115](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L115)

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

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:217](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L217)

Enables registration of a derivation.

The derivation can later be retrieved by the name
attached to it's `[Type]` property.

#### Type Parameters

##### R

`R`

##### T

`T`

##### FM

`FM` *extends* [`ObjectValue`](../../../json/raw/types/ObjectValue.md) | `null`

#### Parameters

##### derivation

[`Derivation`](../../concepts/types/Derivation.md)<`R`, `T`, `FM`>

#### Returns

`void`

***

### registerHashFn()

```ts
registerHashFn(hashFn: HashFn): void;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:227](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L227)

Enables registration of a hashing function

The hashing function can later be retrieved by the name
attached to it's `[Type]` property.

#### Parameters

##### hashFn

[`HashFn`](../../concepts/types/HashFn.md)

#### Returns

`void`

***

### registerResource()

```ts
registerResource(schema: Schema): void;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:197](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L197)

Enables registration of a single Schema representing either
a resource in PolarisMode or LegacyMode or an ObjectSchema
representing an embedded structure in other schemas.

This can be useful for either pre-loading schema information
or for registering schema information delivered by API calls
or other sources just-in-time.

#### Parameters

##### schema

[`Schema`](../../fields/types/Schema.md)

#### Returns

`void`

***

### registerResources()

```ts
registerResources(schemas: Schema[]): void;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:184](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L184)

Enables registration of multiple Schemas at once.

This can be useful for either pre-loading schema information
or for registering schema information delivered by API calls
or other sources just-in-time.

#### Parameters

##### schemas

[`Schema`](../../fields/types/Schema.md)\[]

#### Returns

`void`

***

### registerTrait()?

```ts
optional registerTrait(trait: Trait): void;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:257](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L257)

Registers a [Trait](../../fields/types/Trait.md) for use by resource schemas.

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

[`Trait`](../../fields/types/Trait.md)

#### Returns

`void`

***

### registerTransformation()

```ts
registerTransformation(transform: Transformation): void;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:207](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L207)

Enables registration of a transformation.

The transformation can later be retrieved by the name
attached to it's `[Type]` property.

#### Parameters

##### transform

[`Transformation`](../../concepts/types/Transformation.md)

#### Returns

`void`

***

### ~~relationshipsDefinitionFor()?~~&#x20;

```ts
optional relationshipsDefinitionFor(key: 
  | ResourceKey
  | ObjectWithStringTypeProperty): RelationshipsSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:380](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L380)

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

##### key

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`RelationshipsSchema`](RelationshipsSchema.md)

#### Deprecated

* use [fields](#fields)

***

### resource()

```ts
resource(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty): Schema;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:173](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L173)

Returns the schema for the provided resource type.

#### Parameters

##### resource

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`Schema`](../../fields/types/Schema.md)

***

### resourceHasTrait()

```ts
resourceHasTrait(resource: 
  | ResourceKey
  | ObjectWithStringTypeProperty, trait: string): boolean;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:122](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L122)

Queries whether the given resource has the given trait

#### Parameters

##### resource

| [`ResourceKey`](../../../identifier/types/ResourceKey.md)
| `ObjectWithStringTypeProperty`

##### trait

`string`

#### Returns

`boolean`

***

### resourceTypes()

```ts
resourceTypes(): readonly string[];
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:387](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L387)

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
  | ObjectWithStringTypeProperty): Transformation;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:150](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/schema-service.ts#L150)

Returns the transformation registered with the name provided
by `field.type`. Validates that the field is a valid transformable.

#### Parameters

##### field

| [`GenericField`](../../fields/types/GenericField.md)
| [`ObjectField`](../../fields/types/ObjectField.md)
| [`ArrayField`](../../fields/types/ArrayField.md)
| `ObjectWithStringTypeProperty`

#### Returns

[`Transformation`](../../concepts/types/Transformation.md)
