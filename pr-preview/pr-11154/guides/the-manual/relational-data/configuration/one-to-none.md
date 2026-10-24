---
url: >-
  /pr-preview/pr-11154/guides/the-manual/relational-data/configuration/one-to-none.md
---
# One To None Relationships

Pretend we're building a social network for trail runners 🏃🏃🏾‍♀️, and a TrailRunner (maybe [@runspired](https://github.com/runspired)) can have a favorite Trail to run on . While the TrailRunner has a favorite trail, the trail has no concept of a TrailRunner.

```mermaid
graph LR;
    A(TrailRunner) -. favoriteTrail ..-> B(Trail)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

Such a relationship is singular and unidirectional (it only points to one resource, and only points in one direction).
When a relationship only points in one direction, we say it has no [inverse](../features/inverses.md).

You'll note that effectively this setup implicitly indicates a "many" relationship. A Trail "implicitly" has many runners (for whom it is their favorite trail).

Internally, WarpDrive will keep track of this implicit relationship such that if the trail were to be destroyed in a landslide its deletion would result in removing it as the favoriteTrail for each associated runner.

Implicit relationships are not available as a public API, because they represent a highly incomplete view of the data, but the book-keeping produces benefits such as
the ability to efficiently disassociate the record from relationships when it is destroyed.

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

⛰️ *Trail*

```ts
import Model, { attr } from '@warp-drive/legacy/model';

export default class Trail extends Model {
  @attr name;
}
```

🌲 *TrailRunner*

```ts
import Model, { belongsTo } from '@warp-drive/legacy/model';

export default class TrailRunner extends Model {
  @belongsTo('trail', { inverse: null, async: false })
  favoriteTrail;
}
```

***

## Using JSON Schemas

WarpDrive doesn't care where your schemas come from, how they are authored,
or how you load them into the system so long as when it asks the [SchemaService](/api/@warp-drive/core/types/schema/schema-service/types/SchemaService)
for information it gets back field definitions in the right json shape.

Here, we show how the above trail runner relationship is described by a field definition.

**Current**

```json
{
  "kind": "belongsTo",
  "name": "favoriteTrail",
  "options": { "async": false, "inverse": null },
  "type": "trail",
}
```

**🚧 Coming Soon**

Because we deprecated implicit option values in 4.x, we are now able to change defaults.

This means that the next iteration of Schema will be able to reliably use
the lack of an option like "async" or "inverse" as a false-y value.

We also are shifting the value for "kind" from "belongsTo" to "resource"
to make it more readily clear that relationships do not (by default) have
directionality or ownership over their inverse.

```json
{
  "kind": "resource",
  "name": "favoriteTrail",
  "type": "trail",
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

🌲 *TrailRunner*

```ts
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const TrailRunnerSchema = withDefaults({
  type: 'trail-runner',
  fields: [
    {
      kind: 'belongsTo',
      name: 'favoriteTrail',
      options: { async: false, inverse: null },
      type: 'trail',
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
code quality. For this, we offer a way to express schemas as typescript using types, classes and decorators which are then compiled into json schemas and typescript interfaces for use by your project.

⛰️ *Trail*

```ts
import { field } from '@warp-drive/schema';

export class Trail {
  @field name: string;
}
```

🌲 *TrailRunner*

```ts
import { resource } from '@warp-drive/schema';
import { Trail } from './trail';

export class TrailRunner {
  @resource(Trail) favoriteTrail;
}
```

### LegacyCompat Mode

Support for migrating from `@warp-drive/legacy/model` on a more granular basis is provided by decorators that preserve the semantics of the quirks of that class. This allows you to begin eliminating models
and adopting other features of schemas sooner.

⛰️ *Trail*

```ts
import { attr } from '@warp-drive/schema/legacy';

export default class Trail {
  @attr name: string;
}
```

🌲 *TrailRunner*

```ts
import { belongsTo } from '@warp-drive/schema/legacy';
import Trail from './trail';

export default class TrailRunner {
  @belongsTo(Trail) favoriteTrail;
}
```
