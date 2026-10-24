---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl.md
---

&#x20;

A TypeScript decorator DSL for authoring ***Warp*Drive** resource, object, and
trait schemas using familiar class syntax, compiled to plain `JSON` schemas
at build time.

Authoring schemas as `JSON` keeps them flexible, composable, and easy to
interoperate with (see [In Defense of Machine Formats](https://runspired.com/2025/05/25/in-defense-of-machine-formats.html)
for more on why), but hand-writing `JSON` gives up type-safety, autocomplete,
and refactoring support. This package lets you author with the ergonomics of
TypeScript classes and decorators while still producing standard schema `JSON`
for the store to consume.

## Basic Usage

Decorate a class with `@Resource` and its fields with decorators like `@field`:

::: code-group

```ts [user.ts]
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare firstName: string;
  @field declare lastName: string;
}
```

```json [compiled schema]
{
  "type": "user",
  "identity": { "kind": "@id", "name": "id" },
  "fields": [
    { "kind": "derived", "name": "$type", "type": "@identity", "options": { "key": "type" } },
    { "kind": "field", "name": "firstName" },
    { "kind": "field", "name": "lastName" },
    { "kind": "derived", "name": "constructor", "type": "@constructor" }
  ]
}
```

:::

The decorators are no-ops at runtime: nothing in this package should ever
run in your production bundle. Compilation happens entirely at build time,
so schema files should only ever be imported by the build tooling below,
never by application code.

## Build Setup

Register the compiler as a Vite plugin, pointing it at a glob of your
schema files:

```ts [vite.config.ts]
import { defineConfig } from 'vite';
import { schemaDSL } from '@warp-drive/schema-dsl/vite';

export default defineConfig({
  plugins: [
    schemaDSL({ schemas: 'app/schemas/**/*.ts' }),
    // ...other plugins
  ],
});
```

The plugin exposes the compiled output as the virtual module
`virtual:warp-drive-schemas`:

```ts [app/setup-schemas.ts]
import schemas, { objects, traits } from 'virtual:warp-drive-schemas';

export function registerSchemas(store: Store): void {
  store.schema.registerResources([...schemas, ...objects]);
  traits.forEach((trait) => store.schema.registerTrait?.(trait));
}
```

## What's in a Schema File

A schema file exports one class per resource, object, or trait, each with
exactly one class decorator:

* `@Resource` — a primary resource with its own identity
* `@ObjectSchema` — an embedded object with no independent identity
* `@Trait` — a reusable collection of fields composed onto other schemas via `@trait`

Properties on the class are decorated to describe how each field should be
compiled, for instance `@field` for a plain value, `@local` for local-only
state, or `@derived` for a computed value. See each decorator's own
documentation below for its exact compiled output.

## Entity Decorators

* [ObjectSchema](functions/ObjectSchema.md)
* [Resource](functions/Resource.md)
* [trait](functions/trait.md)
* [Trait](functions/Trait-1.md)

## Field Decorators

* [alias](functions/alias.md)
* [array](functions/array.md)
* [attribute](functions/attribute.md)
* [belongsTo](functions/belongsTo.md)
* [createonly](functions/createonly.md)
* [derived](functions/derived.md)
* [editonly](functions/editonly.md)
* [field](functions/field.md)
* [hash](functions/hash.md)
* [hasMany](functions/hasMany.md)
* [id](functions/id.md)
* [local](functions/local.md)
* [object](functions/object.md)
* [optional](functions/optional.md)
* [readonly](functions/readonly.md)
* [schemaArray](functions/schemaArray.md)
* [schemaObject](functions/schemaObject.md)

## Types

* [AliasOptions](types/AliasOptions.md)
* [ArrayFieldOptions](types/ArrayFieldOptions.md)
* [AttributeOptions](types/AttributeOptions.md)
* [BelongsToOptions](types/BelongsToOptions.md)
* [DerivedOptions](types/DerivedOptions.md)
* [FieldOptions](types/FieldOptions.md)
* [HashOptions](types/HashOptions.md)
* [HasManyOptions](types/HasManyOptions.md)
* [IdOptions](types/IdOptions.md)
* [LocalOptions](types/LocalOptions.md)
* [ObjectFieldOptions](types/ObjectFieldOptions.md)
* [ObjectSchemaOptions](types/ObjectSchemaOptions.md)
* [ResourceOptions](types/ResourceOptions.md)
* [SchemaArrayOptions](types/SchemaArrayOptions.md)
* [SchemaObjectOptions](types/SchemaObjectOptions.md)
* [TraitOptions](types/TraitOptions.md)
