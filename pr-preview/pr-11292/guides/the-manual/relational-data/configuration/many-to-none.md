---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/guides/the-manual/relational-data/configuration/many-to-none.md
description: >-
  Define a unidirectional many-to-none hasMany relationship with inverse null,
  for collections whose other side is too large to track, via Model, JSON
  schema, or LegacyMode.
---

# Many To None Relationships

Imagine our social network for trail runners 🏃🏃🏾‍♀️ allows runners to tag their activities. [#runday](https://www.instagram.com/explore/tags/runday/?hl=en) [#justdoit](https://www.instagram.com/explore/tags/justdoit/?hl=en)

In this model, the ActivityData might have multiple tags, but given that millions if not billions if not trillions of activities might use a tag like [#neverstopexploring](https://www.instagram.com/explore/tags/neverstopexploring/?hl=en), it turns out we definitely don't want the tag to keep track of every activity that ever referenced it.

```mermaid
graph LR;
    A(ActivityData) == tags ==> B(Hashtag)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

Often `ManyToNone` is used for exactly this sort of case, where conceptually the relationship is [many-to-many](./many-to-many.md) in nature, but one side would be so large that modeling it as such is prohibitive.

Here's how we can define such a relationship via various mechanisms.

* [Using @warp-drive/legacy/model](#using-warp-drive-legacy-model)
* [Using json schemas](#using-json-schemas)
* [Using ReactiveResource schemas](#using-reactiveresource-schemas)
* [🚧 Using @warp-drive/schema-record](#using-warp-drive-schema-record-🚧-coming-soon)
  * [Legacy Compat Mode](#legacycompat-mode)

***

## Using `@warp-drive/legacy/model`

> **Note** Models are currently the primary way that users of WarpDrive define "schema".
>
> Models are not the only way to define schema today, but they
> are the most immediately available ergonomic way to do so.

When using Models, WarpDrive parses schema from them at runtime,
converting static information defined on the class into the json
schema format needed by the rest of the system.

This is handled by the implementation of the [SchemaService](/api/@warp-drive/core/types/schema/schema-service/types/SchemaService) provided
by the `@warp-drive/legacy/model` package. The service converts the class
definitions into the json definitions described in the next section.

🏷️ *Hashtag*

```ts
import Model, { attr } from '@warp-drive/legacy/model';

export default class Hashtag extends Model {
  @attr name;
}
```

🏃🏾‍♀️ *ActivityData*

```ts
import Model, { hasMany } from '@warp-drive/legacy/model';

export default class ActivityData extends Model {
  @hasMany('hashtag', { async: false, inverse: null })
  tags;
}
```

***

## Using JSON Schemas

WarpDrive doesn't care where your schemas come from, how they are authored,
or how you load them into the system so long as when it asks the [SchemaService](/api/@warp-drive/core/types/schema/schema-service/types/SchemaService)
for information it gets back field definitions in the right json shape.

Here, we show how the above trail runner relationship is described by a field definition.

**Current**

🏃🏾‍♀️ *ActivityData*

```json
{
  "kind": "hasMany",
  "name": "tags",
  "options": { "async": false, "inverse": null },
  "type": "hashtag",
}
```

**🚧 Coming Soon**

Because we deprecated implicit option values in 4.x, we are now able to change defaults.

This means that the next iteration of Schema will be able to reliably use
the lack of an option like "async" or "inverse" as a false-y value.

We also are shifting the value for "kind" from "belongsTo" to "resource"
to make it more readily clear that relationships do not (by default) have
directionality or ownership over their inverse.

🏃🏾‍♀️ *ActivityData*

```json
{
  "kind": "collection",
  "name": "tags",
  "type": "hashtag",
}
```

***

## Using ReactiveResource Schemas

[ReactiveResource](../../schemas/index.md) reads these same field definitions from a
[ResourceSchema](../../schemas/resources/index.md). Define one in
[LegacyMode](../../schemas/resources/legacy-mode.md), the recommended mode today. Its
`withDefaults` helper sets `legacy: true`, adds the `id` identity field, and appends the
derived and local fields that emulate `Model`. The relationship field is the JSON above,
unchanged.

🏃🏾‍♀️ *ActivityData*

```ts
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const ActivityDataSchema = withDefaults({
  type: 'activity-data',
  fields: [
    {
      kind: 'hasMany',
      name: 'tags',
      options: { async: false, inverse: null },
      type: 'hashtag',
    },
  ],
});
```

If you did not create the store with `useLegacyStore`, call `registerDerivations` once on the
schema service, as shown in
[Configuration](../../schemas/resources/legacy-mode.md#configuration).
[Defining Legacy Schemas](../../schemas/resources/legacy-mode.md#defining-legacy-schemas)
shows how to type the records these schemas produce.

***

## Using `@warp-drive/schema-record` (🚧 Coming Soon)

Working with schemas in a raw json format is far more flexible, lightweight and
performant than working with bulky classes that need to be shipped across the wire, parsed, and instantiated. Even relatively small apps can quickly find themselves shipping large quantities of JS just to describe their data.

No one wants to author schemas in raw JSON though (we hope 😬), and the ergonomics of typed data and editor autocomplete based on your schemas are vital to productivity and
code quality. For this, we offer a way to express schemas as TypeScript using types, classes and decorators which are then compiled into json schemas and TypeScript interfaces for use by your project.

🏷️ *Hashtag*

```ts
import { field } from '@warp-drive/schema';

export class Hashtag extends Model {
  @field name: string;
}
```

🏃🏾‍♀️ *ActivityData*

```ts
import { collection } from '@warp-drive/schema';
import { Hashtag } from './hashtag';

export class ActivityData extends Model {
  @collection(Hashtag) tags;
}
```

### LegacyCompat Mode

Support for migrating from `@warp-drive/legacy/model` on a more granular basis is provided by decorators that preserve the semantics of the quirks of that class. This allows you to begin eliminating models
and adopting other features of schemas sooner.

🏷️ *Hashtag*

```ts
import { attr } from '@warp-drive/schema/legacy';

export class Hashtag extends Model {
  @attr name: string;
}
```

🏃🏾‍♀️ *ActivityData*

```ts
import { hasMany } from '@warp-drive/schema/legacy';
import { Hashtag } from './hashtag';

export class ActivityData extends Model {
  @hasMany(Hashtag) tags;
}
```
