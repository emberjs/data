---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/guides/the-manual/relational-data/configuration/one-to-many.md
description: >-
  Define a bidirectional one-to-many relationship with a resource field on one
  side and a collection field on the other, with the legacy belongsTo and
  hasMany forms at the end.
---

# One To Many Relationships

Imagine our social network for trail runners 🏃🏃🏾‍♀️ allows runners to upload their runs as activities.

In this model, the ActivityData only pertains on one TrailRunner

```mermaid
graph LR;
    A(ActivityData) -. runner ..-> B(TrailRunner)
```

While the Trail Runner has many such activities.

```mermaid
graph LR;
    A(TrailRunner) == activities ==> B(ActivityData)
    A(TrailRunner) == activities ==> C(ActivityData)
    A(TrailRunner) == activities ==> D(ActivityData)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

Let's workout!

There are two ways we can model this relationship: bidirectionally with managed [inverses](../features/inverses.md), or unidirectionally without managed inverses.

In the bidirectional configuration, changes to one side of the relationship change the other side as well. This includes
both updates from remote state (a payload for the resource received from the API) as well as mutations to the local state
(application code setting a new, unsaved value for the relationship).

```mermaid
graph LR;
    A(TrailRunner.activities) ==> B(ActivityData.runner)
    B -.-> A
```

In the unidirectional configuration, we effectively have two separate distinct relationships.

A [many-to-none](./many-to-none.md) relationship from TrailRunner to ActivityData.

```mermaid
graph LR;
    A(TrailRunner) == activities ==> B(ActivityData)
```

And a [one-to-none](./one-to-none.md) relationship from ActivityData to TrailRunner.

```mermaid
graph LR;
    A(ActivityData) -. runner .-> B(TrailRunner)
```

With distinct relationships, we may edit one side without affecting the state of the inverse. This is particularly useful
in two situations.

First, it may be the case that the user has thousands or tens of thousands of activities. In this case, you likely don't want whichever individual activities you happen to load to create an incomplete list of the TrailRunner's activities. It's better to load and work with the activities list in isolation, ideally in a paginated manner.

Second, it may be the case that runner is able to share the activity data with another runner that forgot to record. By not coupling the relationship, the ActivityData can still be owned by the first runner by included in the second runner's list of activities as well.

Head over to [many-to-none](./many-to-none.md) and [one-to-none](./one-to-none.md) if this is the setup that is best for you.

* [Defining the Relationship](#defining-the-relationship)
* [Using the Schema DSL (draft)](#using-the-schema-dsl-draft)
* [Legacy `belongsTo` and `hasMany`](#legacy-belongsto-and-hasmany)

***

## Defining the Relationship

Declare a `resource` field on the "one" side and a `collection` field on the "many" side, each naming the other as its `inverse`. These field kinds behave the same in LegacyMode and PolarisMode; [ResourceSchemas](../../schemas/resources/index.md) shows how to register the schemas they belong to, and [Inverses and Directionality](../features/inverses.md) explains `inverse`.

Schemas are JSON. WarpDrive doesn't care where your schemas come from, how they are authored, or how you load them into the system, so long as when it asks the [SchemaService](/api/@warp-drive/core/types/schema/schema-service/types/SchemaService) for information it gets back field definitions in this shape. Here is how the relationship above is described by field definitions.

🏃🏾‍♀️ *ActivityData*

```json
{
  "kind": "resource",
  "name": "runner",
  "type": "trail-runner",
  "options": { "async": false, "inverse": "activities" }
}
```

🌲 *TrailRunner*

```json
{
  "kind": "collection",
  "name": "activities",
  "type": "activity-data",
  "options": { "async": false, "inverse": "runner" }
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

🏃🏾‍♀️ *ActivityData*

```ts
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const ActivityDataSchema = withDefaults({
  type: 'activity-data',
  fields: [
    {
      kind: 'belongsTo',
      name: 'runner',
      type: 'trail-runner',
      options: { async: false, inverse: 'activities' },
    },
  ],
});
```

🌲 *TrailRunner*

```ts
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const TrailRunnerSchema = withDefaults({
  type: 'trail-runner',
  fields: [
    {
      kind: 'hasMany',
      name: 'activities',
      type: 'activity-data',
      options: { async: false, inverse: 'runner' },
    },
  ],
});
```

If you did not create the store with `useLegacyStore`, call `registerDerivations` once on the schema service, as shown in [Configuration](../../schemas/resources/legacy-mode.md#configuration). [Defining Legacy Schemas](../../schemas/resources/legacy-mode.md#defining-legacy-schemas) shows how to type the records these schemas produce.

### `@warp-drive/legacy/model`

With `Model` classes, the `SchemaService` provided by `@warp-drive/legacy/model` converts the decorators into the schema fields above at runtime.

🏃🏾‍♀️ *ActivityData*

```ts
import Model, { belongsTo } from '@warp-drive/legacy/model';

export default class ActivityData extends Model {
  @belongsTo('trail-runner', { async: false, inverse: 'activities' })
  runner;
}
```

🌲 *TrailRunner*

```ts
import Model, { hasMany } from '@warp-drive/legacy/model';

export default class TrailRunner extends Model {
  @hasMany('activity-data', { async: false, inverse: 'runner' })
  activities;
}
```

### Schema DSL `@belongsTo` and `@hasMany` {#schema-dsl-belongsto-and-hasmany}

The Schema DSL's `@belongsTo` and `@hasMany` compile to the schema fields above and are only valid on resources decorated with `@Resource({ legacy: true })`.

🏃🏾‍♀️ *ActivityData*

```ts
import { Resource, belongsTo } from '@warp-drive/schema-dsl';

@Resource('activity-data', { legacy: true })
export class ActivityData {
  @belongsTo({ type: 'trail-runner', inverse: 'activities', async: false })
  declare runner: unknown;
}
```

🌲 *TrailRunner*

```ts
import { Resource, hasMany } from '@warp-drive/schema-dsl';

@Resource('trail-runner', { legacy: true })
export class TrailRunner {
  @hasMany({ type: 'activity-data', inverse: 'runner', async: false })
  declare activities: unknown;
}
```
