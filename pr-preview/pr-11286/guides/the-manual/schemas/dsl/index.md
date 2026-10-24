---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/the-manual/schemas/dsl.md
description: >-
  Author resource, object, and trait schemas as TypeScript classes with
  `@Resource`, `@Object`, `@Trait`, and field decorators that compile to JSON
  schemas (draft reference).
---

# Schema DSL

***Warp*Drive** offers a TypeScript based compile-time DSL for producing `JSON` resource schemas. Using `JSON` for the output ensures flexibility, composability, and interoperability, while using `TypeScript` for authoring syntax provides a convenient DX.

::: info 💡Read More
This blog post ([In Defense of Machine Formats](https://runspired.com/2025/05/25/in-defense-of-machine-formats.html)) covers the motivations behind using JSON in more depth.
:::

## Overview

The Schema DSL uses TypeScript **class syntax**, **type annotations**, and **decorators** to author resource schemas that compile to WarpDrive's JSON schema format. This approach provides:

* **Type Safety**: Full TypeScript support for read, create, and edit operations
* **IDE Support**: Autocomplete, refactoring, and type checking
* **Compile-Time Generation**: Schemas are generated at build time
* **Runtime Flexibility**: Produces standard JSON schemas for runtime use

## Quick Start

Here's a simple resource schema using the DSL:

```typescript
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
class User {
  @field declare firstName: string;
  @field declare lastName: string;
  @field declare email: string;
}
```

This generates the equivalent JSON schema:

```typescript
{
  type: 'user', // derived from class name
  identity: { kind: '@id', name: '@id' },
  fields: [
    { kind: 'field', name: 'firstName' },
    { kind: 'field', name: 'lastName' },
    { kind: 'field', name: 'email' }
  ]
}
```

The `@Resource` decorator automatically derives the type name from the class name (`User` → `'user'`). You can override this by providing an explicit type: `@Resource('custom-type')`.

## Base Classes and Decorators

### @Resource Decorator

The `@Resource` decorator marks a class as a resource schema with unique identity.

```typescript
@Resource
@Resource(type: string)
@Resource(options: ResourceOptions)
@Resource(type: string, options: ResourceOptions)
```

**Parameters:**

* `type` (optional): Override the resource type name. If omitted, derives from class name:
  * `User` → `'user'`
  * `UserPost` → `'user-post'`
  * `APIKey` → `'api-key'`
* `options`: Optional configuration
  * `legacy?: boolean`: Enable LegacyMode for compatibility with `@warp-drive/legacy/model`
  * `identityField?: string`: Custom identity field name (default: '@id')

**Examples:**

```typescript
// Derived type name from class name
@Resource
class User {
  // type: 'user'
}

@Resource
class UserProfile {
  // type: 'user-profile'
}

// Explicit type name override
@Resource('custom-user')
class User {
  // type: 'custom-user'
}

// Legacy mode resource
@Resource({ legacy: true })
class Post {
  // type: 'post', legacy mode
}

// Both type override and options
@Resource('article', { identityField: 'uuid' })
class Article {
  // type: 'article', custom identity field
}
```

### @Object Decorator

The `@Object` decorator marks a class as an object schema (embedded structure with no independent identity).

```typescript
@Object
@Object(type: string)
@Object(options: ObjectOptions)
@Object(type: string, options: ObjectOptions)
```

**Parameters:**

* `type` (optional): Override the object type name. If omitted, derives from class name (same rules as `@Resource`)
* `options`: Optional configuration
  * `hash?: boolean`: Include hash field for computed identity (default: false)

**Examples:**

```typescript
// Derived type name from class name
@Object
class Address {
  // type: 'address'
  @field declare street: string;
  @field declare city: string;
  @field declare zipCode: string;
}

// Explicit type name
@Object('geo-coordinate')
class Coordinate {
  @field declare latitude: number;
  @field declare longitude: number;
}

// Object with hash identity
@Object({ hash: true })
class Coordinate {
  @field declare latitude: number;
  @field declare longitude: number;
}
```

## Field Decorators

All field decorators follow the pattern:

```typescript
@decorator(options?: FieldOptions)
declare propertyName: Type;
```

### @field

Basic field for primitive values (strings, numbers, booleans, dates).

```typescript
@field
@field(options: {
  sourceKey?: string;
  type?: string;
})
```

**Options:**

* `sourceKey`: Alternative name in the cache if different from property name
* `type`: Transform name (e.g., 'date-time', 'date', 'number')

**Examples:**

```typescript
@Resource
class User {
  @field declare firstName: string;
  @field declare age: number;
  @field declare isActive: boolean;

  @field({ type: 'date-time' })
  declare createdAt: Date;

  @field({ sourceKey: 'email_address' })
  declare email: string;
}
```

### @id

Marks the identity field for a resource. Typically not needed as WarpDrive provides a default `@id` field.

```typescript
@id(options?: {
  sourceKey?: string;
})
```

**Example:**

```typescript
@Resource('user', { identityField: 'uuid' })
class User {
  @id declare uuid: string;

  @field declare name: string;
}
```

### @local

Fields that exist only in local state, not persisted to cache.

```typescript
@local
@local(options: {
  defaultValue?: any;
})
```

**Examples:**

```typescript
@Resource
class User {
  @field declare name: string;
  @local declare isDestroyed: boolean;
  @local declare isDestroying: boolean;

  @local({ defaultValue: false })
  declare isDirty: boolean;
}
```

### @hash

Defines a hash field for computing identity of object schemas.

```typescript
@hash(options?: {
  type: string; // Hash function name
})
```

**Example:**

```typescript
@Object('address', { hash: true })
class Address {
  @hash({ type: 'address-hash' })
  declare $hash: string;

  @field declare street: string;

  @field declare city: string;
}
```

### @object

Unstructured object field containing arbitrary key-value pairs with primitive values.

```typescript
@object
@object(options: {
  sourceKey?: string;
  objectExtensions?: string[];
})
```

**Examples:**

```typescript
@Resource
class User {
  @field declare name: string;
  @object declare metadata: Record<string, string | number | boolean>;

  @object({ objectExtensions: ['legacy-metadata'] })
  declare settings: Record<string, unknown>;
}
```

### @array

Array field containing primitive values.

```typescript
@array
@array(options: {
  sourceKey?: string;
  arrayExtensions?: string[];
})
```

**Examples:**

```typescript
@Resource
class Post {
  @field declare title: string;
  @array declare tags: string[];
  @array declare viewCounts: number[];
}
```

### @schemaObject

Embedded structured object with named fields defined by an ObjectSchema.

```typescript
@schemaObject(options: {
  type: string;
  sourceKey?: string;
  polymorphic?: boolean;
  typeField?: string;
})
```

**Parameters:**

* `type`: The object schema type name
* `sourceKey`: Alternative cache key
* `polymorphic`: Allow multiple types (default: false)
* `typeField`: Discriminator field for polymorphic objects (default: 'type')

**Examples:**

```typescript
@Object('address')
class Address {
  @field declare street: string;

  @field declare city: string;
}

@Resource
class User {
  @field declare name: string;

  @schemaObject({ type: 'address' })
  declare address: Address;
}

// Polymorphic schema object
@Resource('post')
class Post {
  @field declare title: string;

  @schemaObject({
    type: 'content',
    polymorphic: true,
    typeField: 'contentType'
  })
  declare content: TextContent | VideoContent | ImageContent;
}
```

### @schemaArray

Array of structured objects with named fields.

```typescript
@schemaArray(options: {
  type: string;
  sourceKey?: string;
  polymorphic?: boolean;
  typeField?: string;
  key?: '@identity' | '@index' | '@hash' | string;
  defaultValue?: boolean;
})
```

**Parameters:**

* `type`: The object schema type name
* `key`: Strategy for identifying array elements
  * `'@identity'`: Elements have unique identity
  * `'@index'`: Use array index
  * `'@hash'`: Compute hash from content
  * `string`: Use specific field as key
* `defaultValue`: Initialize with empty array (default: false)
* `polymorphic`: Allow multiple types
* `typeField`: Discriminator field for polymorphic arrays

**Examples:**

```typescript
@Object('translation')
class Translation {
  @field declare locale: string;

  @field declare text: string;
}

@Resource('post')
class Post {
  @field declare title: string;

  @schemaArray({
    type: 'translation',
    key: 'locale'
  })
  declare translations: Translation[];
}

// With default value
@Resource
class User {
  @field declare name: string;

  @schemaArray({
    type: 'phoneNumber',
    key: '@index',
    defaultValue: true
  })
  declare phoneNumbers: PhoneNumber[];
}
```

### @derived

Computed read-only field that is not stored in cache.

```typescript
@derived(options: {
  type: string; // Derivation function name
})
```

**Examples:**

```typescript
@Resource
class User {
  @field declare firstName: string;

  @field declare lastName: string;

  @derived({ type: 'fullName' })
  declare fullName: string;
}

// Register derivation
schema.registerDerivation({
  type: 'fullName',
  options: {},
  derive(record: User) {
    return `${record.firstName} ${record.lastName}`;
  }
});
```

### @alias

Field aliasing for renaming or transforming cache fields.

```typescript
@alias(options: {
  sourceKey: string;
  type?: string;
})
```

**Examples:**

```typescript
@Resource
class User {
  @alias({ sourceKey: 'first_name' })
  declare firstName: string;

  @alias({ sourceKey: 'last_name' })
  declare lastName: string;

  @alias({
    sourceKey: 'created_at',
    type: 'date-time'
  })
  declare createdAt: Date;
}
```

### Legacy Relationship Fields

For LegacyMode resources only:

#### @attribute

```typescript
@attribute
@attribute(options: {
  sourceKey?: string;
  type?: string;
})
```

#### @belongsTo

```typescript
@belongsTo(options: {
  type: string;
  async?: boolean;
  inverse?: string;
  sourceKey?: string;
})
```

**Examples:**

```typescript
@Resource({ legacy: true })
class Comment {
  @field declare text: string;

  @belongsTo({
    type: 'user',
    async: false,
    inverse: 'comments'
  })
  declare author: User;

  @belongsTo({
    type: 'post',
    async: true
  })
  declare post: Post;
}
```

#### @hasMany

```typescript
@hasMany(options: {
  type: string;
  async?: boolean;
  inverse?: string;
  sourceKey?: string;
})
```

**Examples:**

```typescript
@Resource('user', { legacy: true })
class User {
  @field declare name: string;

  @hasMany({
    type: 'post',
    async: true,
    inverse: 'author'
  })
  declare posts: Post[];

  @hasMany({
    type: 'comment',
    async: false,
    inverse: 'author'
  })
  declare comments: Comment[];
}
```

## Traits

Traits provide reusable field collections for polymorphic composition.

### Defining Traits

Use the `@Trait` decorator to define a trait:

```typescript
@Trait(name: string, options?: TraitOptions)
```

**Parameters:**

* `name`: Trait identifier
* `options`:
  * `mode?: 'legacy' | 'polaris'`: Trait mode (default: 'polaris')

**Examples:**

```typescript
// Timestamped trait
@Trait('timestamped')
class Timestamped {
  @field({ type: 'date-time' })
  declare createdAt: Date;

  @field({ type: 'date-time' })
  declare updatedAt: Date;
}

// Auditable trait
@Trait('auditable')
class Auditable {
  @field declare createdBy: string;

  @field declare updatedBy: string;
}

// Legacy trait
@Trait('softDelete', { mode: 'legacy' })
class SoftDelete {
  @field({ type: 'date-time' })
  declare deletedAt: Date | null;

  @local declare isDeleted: boolean;
}
```

### Applying Traits

Use the `@trait` decorator (lowercase) to apply traits to resources:

```typescript
@trait(...traits: (typeof TraitClass)[])
```

**Examples:**

```typescript
// Single trait
@Resource
@trait(Timestamped)
class User {
  @field declare name: string;

  // Inherits createdAt and updatedAt from Timestamped
}

// Multiple traits
@Resource
@trait(Timestamped, Auditable)
class Post {
  @field declare title: string;
  @field declare content: string;

  // Inherits:
  // - createdAt, updatedAt from Timestamped
  // - createdBy, updatedBy from Auditable
}

// Trait composition (traits can use other traits)
@Trait('versionable')
@trait(Timestamped, Auditable)
class Versionable {
  @field declare version: number;

  // Inherits from Timestamped and Auditable
}

@Resource
@trait(Versionable)
class Document {
  @field declare title: string;

  // Inherits all fields from Versionable chain
}
```

### Trait Resolution Rules

1. **Post-Order Traversal**: Traits are processed recursively before the resource
2. **Left-to-Right**: Earlier traits are processed first
3. **Last Wins**: Later traits override earlier ones, resource fields override all
4. **Cycle Detection**: Circular trait dependencies are detected in development mode

**Example:**

```typescript
@Trait('A')
class TraitA {
  @field declare fieldA: string;
  @field declare shared: string; // Will be overridden
}

@Trait('B')
class TraitB {
  @field declare fieldB: string;
  @field declare shared: string; // Will be overridden
}

@Resource
@trait(TraitA, TraitB)
class Example {
  @field declare shared: string; // Wins

  // Final fields: fieldA, fieldB, shared (from Example)
}
```

## Type Generation

The DSL generates three types for each resource:

### 1. Read Type (Immutable)

The base type for reading data from the store.

```typescript
@Resource
class User {
  @field declare firstName: string;

  @field declare lastName: string;

  @derived({ type: 'fullName' })
  declare fullName: string;
}

// Generated type: User
type UserRead = User;

const user: User = store.peekRecord('user', '1');
console.log(user.firstName); // string
console.log(user.fullName);  // string (derived, read-only)
// user.firstName = 'new'; // Error: readonly
```

### 2. Create Type (Writable Fields Only)

Type for creating new resources.

```typescript
// Generated type: CreateUser
type CreateUser = {
  firstName: string;
  lastName: string;
  // Note: fullName is omitted (derived fields not settable)
  // Note: @id is omitted (generated by server)
}

const newUser = store.createRecord<User>('user', {
  firstName: 'John',
  lastName: 'Doe'
});
```

### 3. Edit Type (Editable Fields)

Type for editing existing resources.

```typescript
// Generated type: EditUser
type EditUser = {
  firstName?: string;
  lastName?: string;
  // Note: fullName is omitted (derived, read-only)
  // Note: all fields are optional for partial updates
}

const user = store.peekRecord('user', '1');
user.edit((draft: EditUser) => {
  draft.firstName = 'Jane';
  // draft.fullName = 'test'; // Error: readonly/doesn't exist
});
```

### Type Modifiers

Control field mutability with decorator modifiers. These decorators can be stacked with field decorators to control when fields can be set.

#### @readonly

Fields that cannot be created or edited (server-managed only):

```typescript
import { readonly } from '@warp-drive/schema-dsl';

@Resource
class Post {
  @field declare title: string;

  @readonly
  @field({ type: 'date-time' })
  declare createdAt: Date;

  @readonly
  @field declare viewCount: number;
}

// CreatePost: { title: string } - createdAt and viewCount omitted
// EditPost: { title?: string } - createdAt and viewCount omitted
```

#### @optional

Fields that may be omitted during creation (but required if editing):

```typescript
import { optional } from '@warp-drive/schema-dsl';

@Resource
class User {
  @field declare email: string;

  @optional
  @field declare bio: string;
}

// CreateUser: { email: string, bio?: string }
// EditUser: { email?: string, bio?: string }
```

#### @createonly

Fields that can only be set during creation, not edited:

```typescript
import { createonly } from '@warp-drive/schema-dsl';

@Resource
class Post {
  @createonly
  @field declare slug: string;

  @field declare title: string;
}

// CreatePost: { slug: string, title: string }
// EditPost: { title?: string } - slug omitted
```

#### @editonly

Fields that can only be set during editing, not creation:

```typescript
import { editonly } from '@warp-drive/schema-dsl';

@Resource
class Document {
  @field declare content: string;

  @editonly
  @field({ type: 'date-time' })
  declare lastEditedAt: Date;
}

// CreateDocument: { content: string } - lastEditedAt omitted
// EditDocument: { content?: string, lastEditedAt?: Date }
```

#### Combining Modifiers

Modifiers can be combined for complex scenarios:

```typescript
@Resource
class BlogPost {
  // Required during create, can be edited
  @field declare title: string;

  // Optional during create, can be edited
  @optional
  @field declare excerpt: string;

  // Can only be set during create
  @createonly
  @field declare slug: string;

  // Server-managed, never set by client
  @readonly
  @field({ type: 'date-time' })
  declare publishedAt: Date;
}

// CreateBlogPost: { title: string, excerpt?: string, slug: string }
// EditBlogPost: { title?: string, excerpt?: string }
```

## Modes

The DSL supports both Polaris (modern) and Legacy modes.

### PolarisMode (Default)

Modern immutable records with isolated editing.

```typescript
@Resource
class User {
  @field declare name: string;

  @field declare email: string;
}

const user = store.peekRecord<User>('user', '1');
console.log(user.name); // Immutable read

user.edit((draft) => {
  draft.name = 'New Name'; // Mutable draft
  draft.email = 'new@example.com';
});
```

**Features:**

* Immutable records by default
* Explicit editing via `.edit()`
* No async relationships (use LinksMode)
* Type-safe with generated types

### LegacyMode

Compatibility mode for `@warp-drive/legacy/model`.

```typescript
@Resource('user', { legacy: true })
class User {
  @field declare name: string;

  @field declare email: string;

  @belongsTo({ type: 'organization', async: true })
  declare organization: Organization;

  @hasMany({ type: 'post', async: true })
  declare posts: Post[];

  @local declare isDestroyed: boolean;

  @local declare isDestroying: boolean;
}

const user = store.peekRecord<User>('user', '1');
user.name = 'New Name'; // Direct mutation
const posts = await user.posts; // Async relationship
```

**Features:**

* Mutable records
* Async relationships (`belongsTo`, `hasMany`)
* State properties (`isDestroyed`, `isDestroying`, etc.)
* Full Model API compatibility
* Requires `@warp-drive/legacy` package

### Choosing a Mode

Use **PolarisMode** for new projects:

* Better performance
* Immutability benefits
* Modern API
* Future-proof

Use **LegacyMode** when:

* Migrating from Ember Data
* Need async relationships
* Require Model API compatibility

## Extensions

Extensions provide temporary behavioral enhancements during migration.

### Registering Extensions

```typescript
schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
  type: 'legacy-array',
  extend(arr: unknown[]) {
    // Add methods or properties to arrays
  }
});
```

### Using Extensions

Apply extensions in field decorators:

```typescript
@Resource
class User {
  @array({ arrayExtensions: ['legacy-array'] })
  declare tags: string[];

  @object({ objectExtensions: ['legacy-metadata'] })
  declare metadata: Record<string, unknown>;
}
```

### Object-Level Extensions

Apply extensions to entire object schemas:

```typescript
@Object('address', { extensions: ['legacy-address'] })
class Address {
  @field declare street: string;
}
```

## Advanced Patterns

### Polymorphic Relationships

Handle multiple types in a single field:

```typescript
@Object('textContent')
class TextContent {
  @field declare type: 'text';

  @field declare text: string;
}

@Object('videoContent')
class VideoContent {
  @field declare type: 'video';

  @field declare url: string;

  @field declare duration: number;
}

@Object('imageContent')
class ImageContent {
  @field declare type: 'image';

  @field declare url: string;

  @field declare alt: string;
}

@Resource('post')
class Post {
  @field declare title: string;

  @schemaObject({
    type: 'content',
    polymorphic: true,
    typeField: 'type'
  })
  declare content: TextContent | VideoContent | ImageContent;
}

// Usage
const post = store.peekRecord<Post>('post', '1');
if (post.content.type === 'video') {
  console.log(post.content.duration); // Type narrowing works
}
```

### Schema Arrays with Keys

Different strategies for identifying array elements:

```typescript
@Object('phoneNumber')
class PhoneNumber {
  @field declare type: string;

  @field declare number: string;
}

@Resource
class User {
  // Use field as key
  @schemaArray({
    type: 'phoneNumber',
    key: 'type'
  })
  declare phoneNumbers: PhoneNumber[];
}

// Array operations maintain identity by 'type' field
user.edit((draft) => {
  draft.phoneNumbers = [
    { type: 'mobile', number: '555-1234' },
    { type: 'home', number: '555-5678' }
  ];
});
```

### Nested Object Schemas

```typescript
@Object('coordinate')
class Coordinate {
  @field declare latitude: number;

  @field declare longitude: number;
}

@Object('address')
class Address {
  @field declare street: string;

  @field declare city: string;

  @schemaObject({ type: 'coordinate' })
  declare location: Coordinate;
}

@Resource('venue')
class Venue {
  @field declare name: string;

  @schemaObject({ type: 'address' })
  declare address: Address;
}

// Usage
const venue = store.peekRecord<Venue>('venue', '1');
console.log(venue.address.location.latitude);
```

### Transformations

Register and use custom transformations:

```typescript
// Register transformation
schema.registerTransformation({
  type: 'currency',
  serialize(value: number): string {
    return `$${(value / 100).toFixed(2)}`;
  },
  hydrate(value: string): number {
    return Math.round(parseFloat(value.slice(1)) * 100);
  }
});

// Use in schema
@Resource('product')
class Product {
  @field declare name: string;

  @field({ type: 'currency' })
  declare price: number; // Stored as cents, displayed as dollars
}
```

### Derivations

Create computed fields:

```typescript
// Register derivation
schema.registerDerivation({
  type: 'fullName',
  options: {},
  derive(record: User, options: {}, prop: string) {
    return `${record.firstName} ${record.lastName}`;
  }
});

// Use in schema
@Resource
class User {
  @field declare firstName: string;

  @field declare lastName: string;

  @derived({ type: 'fullName' })
  declare fullName: string;
}
```

### Hash Functions

Compute identity for object schemas:

```typescript
// Register hash function
schema.registerHashFn({
  type: 'coordinate-hash',
  compute(obj: Coordinate): string {
    return `${obj.latitude},${obj.longitude}`;
  }
});

// Use in schema
@Object('coordinate', { hash: true })
class Coordinate {
  @hash({ type: 'coordinate-hash' })
  declare $hash: string;

  @field declare latitude: number;

  @field declare longitude: number;
}
```

## Best Practices

### Schema Organization

```typescript
// schemas/traits/timestamped.ts
@Trait('timestamped')
export class Timestamped {
  @field({ type: 'date-time' })
  declare createdAt: Date;

  @field({ type: 'date-time' })
  declare updatedAt: Date;
}

// schemas/objects/address.ts
@Object('address')
export class Address {
  @field declare street: string;

  @field declare city: string;

  @field declare zipCode: string;
}

// schemas/resources/user.ts
import { Timestamped } from '../traits/timestamped';
import { Address } from '../objects/address';

@Resource
@trait(Timestamped)
export class User {
  @field declare name: string;

  @field declare email: string;

  @schemaObject({ type: 'address' })
  declare address: Address;
}
```

### Field Naming Conventions

```typescript
@Resource
class User {
  // Prefer camelCase for JavaScript
  @field declare firstName: string;

  // Use sourceKey for snake_case APIs
  @field({ sourceKey: 'phone_number' })
  declare phoneNumber: string;

  // Prefix hash fields with $
  @hash({ type: 'user-hash' })
  declare $hash: string;

  // Prefix derived fields with $ or use descriptive names
  @derived({ type: 'fullName' })
  declare fullName: string;
}
```

### Type Safety

```typescript
// Export types for external use
@Resource
export class User {
  @field declare name: string;

  @field declare email: string;
}

// Use generated types
export type UserRead = User;
export type UserCreate = CreateUser;
export type UserEdit = EditUser;

// In application code
function displayUser(user: UserRead) {
  console.log(user.name);
}

function updateUser(id: string, updates: UserEdit) {
  const user = store.peekRecord<User>('user', id);
  user.edit((draft) => {
    Object.assign(draft, updates);
  });
}
```

### Avoid Over-Engineering

```typescript
// Good: Simple fields for simple data
@Resource
class User {
  @field declare name: string;

  @object declare settings: Record<string, string>;
}

// Avoid: Over-structured for simple data
@Object('setting')
class Setting {
  @field declare key: string;

  @field declare value: string;
}

@Resource
class User {
  @field declare name: string;

  @schemaArray({ type: 'setting', key: 'key' })
  declare settings: Setting[];
}
```

## Migration Guide

### From JSON Schemas

**Before (JSON):**

```typescript
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { kind: 'field', name: 'firstName' },
    { kind: 'field', name: 'lastName' },
    { kind: 'field', name: 'email' },
    {
      kind: 'schema-object',
      name: 'address',
      type: 'address'
    }
  ],
  traits: ['timestamped']
});
```

**After (DSL):**

```typescript
import { Resource, field, schemaObject, trait } from '@warp-drive/schema-dsl';
import { Timestamped } from '../traits/timestamped';

@Resource
@trait(Timestamped)
export class User {
  @field declare firstName: string;

  @field declare lastName: string;

  @field declare email: string;

  @schemaObject({ type: 'address' })
  declare address: Address;
}
```

### From Ember Data Models

**Before (Ember Data):**

```typescript
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class UserModel extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') email;
  @belongsTo('organization', { async: true }) organization;
  @hasMany('post', { async: true }) posts;
}
```

**After (DSL):**

```typescript
import { Resource, field, belongsTo, hasMany } from '@warp-drive/schema-dsl';

@Resource('user', { legacy: true })
export class User {
  @field declare firstName: string;

  @field declare lastName: string;

  @field declare email: string;

  @belongsTo({ type: 'organization', async: true })
  declare organization: Organization;

  @hasMany({ type: 'post', async: true })
  declare posts: Post[];
}
```

## API Reference

### Decorators

| Decorator | Purpose | Applies To |
|-----------|---------|-----------|
| `@Resource` / `@Resource(type?, options?)` | Define resource schema | Class |
| `@Object` / `@Object(type?, options?)` | Define object schema | Class |
| `@Trait(name, options?)` | Define trait | Class |
| `@trait(...traits)` | Apply traits | Class |
| `@field` / `@field(options?)` | Basic field | Property |
| `@id` / `@id(options?)` | Identity field | Property |
| `@local` / `@local(options?)` | Local-only field | Property |
| `@hash(options)` | Hash field | Property |
| `@object` / `@object(options?)` | Unstructured object | Property |
| `@array` / `@array(options?)` | Primitive array | Property |
| `@schemaObject(options)` | Structured object | Property |
| `@schemaArray(options)` | Structured array | Property |
| `@derived(options)` | Computed field | Property |
| `@alias(options)` | Field alias | Property |
| `@attribute` / `@attribute(options?)` | Legacy attribute | Property |
| `@belongsTo(options)` | Legacy belongsTo | Property |
| `@hasMany(options)` | Legacy hasMany | Property |
| `@readonly` | Server-managed field | Property |
| `@optional` | Optional on create | Property |
| `@createonly` | Only set on create | Property |
| `@editonly` | Only set on edit | Property |

### Common Options

```typescript
interface BaseFieldOptions {
  sourceKey?: string;      // Alternative cache key
  type?: string;           // Transform/derivation name
}

interface SchemaOptions {
  polymorphic?: boolean;   // Allow multiple types
  typeField?: string;      // Discriminator field
  defaultValue?: boolean;  // Initialize with default
}

interface ArrayOptions {
  key?: '@identity' | '@index' | '@hash' | string;
  arrayExtensions?: string[];
}

interface ObjectOptions {
  objectExtensions?: string[];
}

interface ResourceOptions {
  legacy?: boolean;        // Enable legacy mode
  identityField?: string;  // Custom identity field name
}

interface ObjectSchemaOptions {
  hash?: boolean;          // Include hash field
  extensions?: string[];   // Object-level extensions
}
```

## Compilation

The DSL compiles TypeScript schemas to JSON at build time.

### Build Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { schemaDSL } from '@warp-drive/schema-dsl/vite';

export default defineConfig({
  plugins: [
    schemaDSL({
      schemas: './app/schemas/**/*.ts',
      output: './app/schemas/generated.json'
    })
  ]
});
```

### Generated Output

The compiler produces:

1. **JSON Schema File**: All schemas as JSON for runtime registration
2. **Type Definitions**: TypeScript types for read/create/edit operations
3. **Source Maps**: For debugging

```json
// schemas/generated.json
{
  "resources": {
    "user": {
      "type": "user",
      "identity": { "kind": "@id", "name": "@id" },
      "fields": [
        { "kind": "field", "name": "firstName" },
        { "kind": "field", "name": "lastName" }
      ]
    }
  },
  "objects": {
    "address": {
      "type": "address",
      "identity": null,
      "fields": [
        { "kind": "field", "name": "street" },
        { "kind": "field", "name": "city" }
      ]
    }
  },
  "traits": {
    "timestamped": {
      "name": "timestamped",
      "mode": "polaris",
      "fields": [
        { "kind": "field", "name": "createdAt", "type": "date-time" },
        { "kind": "field", "name": "updatedAt", "type": "date-time" }
      ]
    }
  }
}
```

### Runtime Registration

```typescript
import { schemas } from './schemas/generated.json';

// Register all schemas
store.schema.registerResources(schemas.resources);
Object.values(schemas.traits).forEach(trait =>
  store.schema.registerTrait(trait)
);

// Or register individually
import { User } from './schemas/resources/user';
store.schema.registerResource(User);
```

## FAQ

### Why use a DSL instead of JSON?

The DSL provides:

* Type safety and IDE support
* Better refactoring experience
* Compile-time validation
* Generated types for type-safe operations
* While still producing flexible JSON output

### Can I mix DSL and JSON schemas?

Yes! The DSL compiles to the same JSON format, so you can use both:

```typescript
// DSL schema
@Resource
class User {
  @field declare name: string;
}

// JSON schema
const PostSchema = {
  type: 'post',
  fields: [
    { kind: 'field', name: 'title' }
  ]
};

// Both work together
store.schema.registerResource(User);
store.schema.registerResource(PostSchema);
```

### How do I add custom field types?

Use the `type` option with transformations:

```typescript
// Register transformation
schema.registerTransformation({
  type: 'color',
  serialize(value: { r: number, g: number, b: number }): string {
    return `rgb(${value.r},${value.g},${value.b})`;
  },
  hydrate(value: string): { r: number, g: number, b: number } {
    const [r, g, b] = value.match(/\d+/g).map(Number);
    return { r, g, b };
  }
});

// Use in schema
@Resource
class Theme {
  @field({ type: 'color' })
  declare primaryColor: { r: number, g: number, b: number };
}
```

### How do I handle nullable fields?

Use TypeScript's union types:

```typescript
@Resource
class User {
  @field declare name: string;

  @field declare middleName: string | null;

  @schemaObject({ type: 'address' })
  declare address: Address | null;
}
```

### Can traits have traits?

Yes! Traits support composition:

```typescript
@Trait('auditable')
@trait(Timestamped)
class Auditable {
  @field declare createdBy: string;
  @field declare updatedBy: string;

  // Also has createdAt, updatedAt from Timestamped
}
```

### How do I version schemas?

Use different resource types:

```typescript
// Version 1
@Resource('user:v1')
class UserV1 {
  @field declare name: string;
}

// Version 2
@Resource('user:v2')
class UserV2 {
  @field declare firstName: string;
  @field declare lastName: string;
}
```

Or use traits for shared fields:

```typescript
@Trait('user-base')
class UserBase {
  @field declare email: string;
}

@Resource('user:v1')
@trait(UserBase)
class UserV1 {
  @field declare name: string;
}

@Resource('user:v2')
@trait(UserBase)
class UserV2 {
  @field declare firstName: string;
  @field declare lastName: string;
}
```
