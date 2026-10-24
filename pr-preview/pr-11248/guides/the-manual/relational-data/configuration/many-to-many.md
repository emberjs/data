---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/guides/the-manual/relational-data/configuration/many-to-many.md
description: >-
  Define a bidirectional many-to-many relationship with a collection field that
  is its own inverse, or a one-way many-to-none variant, with the legacy hasMany
  forms at the end.
---

# Many To Many Relationships

Imagine our social network for trail runners 🏃🏃🏾‍♀️ allows runners to connect with friends, other trail runners!

```mermaid
graph LR;
    A(TrailRunner) <== friends ==> B(TrailRunner)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

Or, maybe more accurately since this is a [*reflexive*](../../misc/terminology.md#reflexive) relationship:

```mermaid
graph LR;
    A(TrailRunner) <== friends ==> A
```

There are two ways we can model this relationship: bidirectionally with managed [inverses](../features/inverses.md), or unidirectionally without managed inverses.

In the bidirectional configuration, changes to one side of the relationship change the other side as well. This includes
both updates from remote state (a payload for the resource received from the API) as well as mutations to the local state
(application code setting a new, unsaved value for the relationship).

```mermaid
graph LR;
    A(TrailRunnerA.friends) <==> B(TrailRunnerB.friends)
```

In the unidirectional configuration, we effectively have two separate distinct [many-to-none](./many-to-none.md) relationships.

```mermaid
graph LR;
    A(TrailRunnerA) == friends ==> B(TrailRunnerB)
```

```mermaid
graph LR;
    A(TrailRunnerB) == friends ==> B(TrailRunnerA)
```

With distinct relationships, we may edit one side without affecting the state of the inverse. This is especially useful
when the collections might be very large, paginated, or not
bidirectional in nature.

For an example of a non-bidirectional relationship of this sort, it might be that Chris lists Thomas as a friend, but sadly Thomas does not feel the same. This Thomas being in Chris' friends does not mean that Chris should be in the list of Thomas' friends.

Head over to [many-to-none](./many-to-none.md) if this is the setup that is best for you.

* [Defining the Relationship](#defining-the-relationship)
* [Using the Schema DSL (draft)](#using-the-schema-dsl-draft)
* [Legacy `belongsTo` and `hasMany`](#legacy-belongsto-and-hasmany)

***

## Defining the Relationship

Here the relationship is between two `trail-runner` records, so a single `collection` field is its own `inverse`. These field kinds behave the same in LegacyMode and PolarisMode; [ResourceSchemas](../../schemas/resources/index.md) shows how to register the schemas they belong to, and [Inverses and Directionality](../features/inverses.md) explains `inverse`.

Schemas are JSON. WarpDrive doesn't care where your schemas come from, how they are authored, or how you load them into the system, so long as when it asks the [SchemaService](/api/@warp-drive/core/types/schema/schema-service/types/SchemaService) for information it gets back field definitions in this shape. Here is how the relationship above is described by field definitions.

🌲 *TrailRunner*

```json
{
  "kind": "collection",
  "name": "friends",
  "type": "trail-runner",
  "options": { "async": false, "inverse": "friends" }
}
```

The one-way [many-to-none](./many-to-none.md) variation of this would be:

```json
{
  "kind": "collection",
  "name": "friends",
  "type": "trail-runner",
  "options": { "async": false, "inverse": null }
}
```

::: tip Loading a large "many" side
A `collection` field holds the complete list and never pages it. If the list could be large, don't load it with `doc.fetch()`; [Large Collections](../advanced/large-collections.md) shows how to load it with a top-level request instead.
:::

***

## Using the Schema DSL (draft)

Working with schemas in a raw json format is far more flexible, lightweight and
performant than working with bulky classes that need to be shipped across the wire, parsed, and instantiated. Even relatively small apps can quickly find themselves shipping large quantities of JS just to describe their data.

No one wants to author schemas in raw JSON though (we hope 😬), and the ergonomics of typed data and editor autocomplete based on your schemas are vital to productivity and
code quality. For this, we offer a way to express schemas as TypeScript using types, classes and decorators which are then compiled into json schemas and TypeScript interfaces for use by your project.

The [Schema DSL](../../schemas/dsl/index.md) (`@warp-drive/schema-dsl`) provides this. Decorators for `resource` and `collection` fields are planned; until they land, the DSL can declare this relationship only with its legacy `@belongsTo` and `@hasMany` decorators, shown [below](#schema-dsl-belongsto-and-hasmany).

***

## Legacy `belongsTo` and `hasMany`

The legacy kinds are kept for apps migrating from `@warp-drive/legacy/model`. To move them to the fields above, see [Migrating Relationships to resource and collection](/upgrading/v5/relationships.md).

### Schema Fields

In a [LegacyMode](../../schemas/resources/legacy-mode.md) `ResourceSchema`, where `withDefaults` sets `legacy: true`, adds the `id` identity field, and appends the derived and local fields that emulate `Model`:

🌲 *TrailRunner*

```ts
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const TrailRunnerSchema = withDefaults({
  type: 'trail-runner',
  fields: [
    {
      kind: 'hasMany',
      name: 'friends',
      type: 'trail-runner',
      options: { async: false, inverse: 'friends' },
    },
  ],
});
```

The many-to-none variation uses `inverse: null` on the same field.

If you did not create the store with `useLegacyStore`, call `registerDerivations` once on the schema service, as shown in [Configuration](../../schemas/resources/legacy-mode.md#configuration). [Defining Legacy Schemas](../../schemas/resources/legacy-mode.md#defining-legacy-schemas) shows how to type the records these schemas produce.

### `@warp-drive/legacy/model`

With `Model` classes, the `SchemaService` provided by `@warp-drive/legacy/model` converts the decorators into the schema fields above at runtime.

🌲 *TrailRunner*

```ts
import Model, { hasMany } from '@warp-drive/legacy/model';

export default class TrailRunner extends Model {
  @hasMany('trail-runner', { async: false, inverse: 'friends' })
  friends;
}
```

### Schema DSL `@belongsTo` and `@hasMany` {#schema-dsl-belongsto-and-hasmany}

The Schema DSL's `@belongsTo` and `@hasMany` compile to the schema fields above and are only valid on resources decorated with `@Resource({ legacy: true })`.

🌲 *TrailRunner*

```ts
import { Resource, hasMany } from '@warp-drive/schema-dsl';

@Resource('trail-runner', { legacy: true })
export class TrailRunner {
  @hasMany({ type: 'trail-runner', inverse: 'friends', async: false })
  declare friends: unknown;
}
```
