---
url: >-
  /pr-preview/pr-11154/guides/the-manual/relational-data/configuration/one-to-one.md
---
# One To One Relationships

Imagine our social network for trail runners 🏃🏃🏾‍♀️ allows runners to add their other social accounts. For instance, the TrailRunner [@runspired](https://github.com/runspired) might add their Instagram account.

Here, the coupling goes both ways. In this model, the 📸 Instagram account can only belong to one Trail Runner, and the Trail Runner only has one Instagram Account. Let's take a selfie:

```mermaid
graph LR;
    A(TrailRunner) -. instagram ..-> B(InstagramAccount)
    B -. runner .-> A
```

There are two ways we can model this relationship: bidirectionally with managed [inverses](../features/inverses.md), or unidirectionally without managed inverses.

In the bidirectional configuration, changes to one side of the relationship change the other side as well. This includes
both updates from remote state (a payload for the resource received from the API) as well as mutations to the local state
(application code setting a new, unsaved value for the relationship).

```mermaid
graph LR;
    A(TrailRunner.instagram) <-.-> B(InstagramAccount.runner)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

In the unidirectional configuration, we effectively have two separate distinct [one-to-none](./one-to-none.md) relationships.

```mermaid
graph LR;
    A(TrailRunner) -. instagram .-> B(InstagramAccount)
```

```mermaid
graph LR;
    A(InstagramAccount) -. runner .-> B(TrailRunner)
```

With distinct relationships, we may edit one side without affecting the state of the inverse.

Note, modeling this setup as two "one-to-none" relationships has the advantage of creating an implicit "many" relationship in both directions. Imagine that many runners could have the same instagram account and that at the same time many instagram accounts could belong to the same runner.

You might be tempted to think of this as a [many-to-many](./many-to-many.md) or two [many-to-none](./many-to-one.md), but sometimes this is effectively modeled as two `one-to-none` relationships.

```mermaid
graph LR;
    A(TrailRunner1) -. account .-> D(InstagramAccount1)
    B(TrailRunner2) -. account .-> D(InstagramAccount1)
    C(TrailRunner3) -. account .-> D(InstagramAccount1)
```

```mermaid
graph LR;
    A(InstagramAccount1) -. runner .-> D(TrailRunner1)
    B(InstagramAccount2) -. runner .-> D(TrailRunner1)
    C(InstagramAccount3) -. runner .-> D(TrailRunner1)
```

Head over to [one-to-none](./one-to-none.md) if this is the setup that is best for you. Else, here's how we can define such a relationship via various mechanisms.

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

📸 *InstagramAccount*

```ts
import Model, { belongsTo } from '@warp-drive/legacy/model';

export default class InstagramAccount extends Model {
  @belongsTo('trail-runner', { inverse: 'instagram', async: false })
  runner;
}
```

🌲 *TrailRunner*

```ts
import Model, { belongsTo } from '@warp-drive/legacy/model';

export default class TrailRunner extends Model {
  @belongsTo('instagram-account', { inverse: 'runner', async: false })
  instagram;
}
```

***

## Using JSON Schemas

WarpDrive doesn't care where your schemas come from, how they are authored,
or how you load them into the system so long as when it asks the [SchemaService](/api/@warp-drive/core/types/schema/schema-service/types/SchemaService)
for information it gets back field definitions in the right json shape.

Here, we show how the above trail runner relationship is described by a field definition.

**Current**

📸 *InstagramAccount*

```json
{
  "kind": "belongsTo",
  "name": "runner",
  "options": { "async": false, "inverse": "instagram" },
  "type": "trail-runner",
}
```

🌲 *TrailRunner*

```json
{
  "kind": "belongsTo",
  "name": "instagram",
  "options": { "async": false, "inverse": "runner" },
  "type": "instagram-account",
}
```

**🚧 Coming Soon**

Because we deprecated implicit option values in 4.x, we are now able to change defaults.

This means that the next iteration of Schema will be able to reliably use
the lack of an option like "async" or "inverse" as a false-y value.

We also are shifting the value for "kind" from "belongsTo" to "resource"
to make it more readily clear that relationships do not (by default) have
directionality or ownership over their inverse.

📸 *InstagramAccount*

```json
{
  "kind": "resource",
  "name": "runner",
  "options": { "inverse": "instagram" },
  "type": "trail-runner",
}
```

🌲 *TrailRunner*

```json
{
  "kind": "resource",
  "name": "instagram",
  "options": { "inverse": "runner" },
  "type": "instagram-account",
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

📸 *InstagramAccount*

```ts
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const InstagramAccountSchema = withDefaults({
  type: 'instagram-account',
  fields: [
    {
      kind: 'belongsTo',
      name: 'runner',
      options: { async: false, inverse: 'instagram' },
      type: 'trail-runner',
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
      kind: 'belongsTo',
      name: 'instagram',
      options: { async: false, inverse: 'runner' },
      type: 'instagram-account',
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

📸 *InstagramAccount*

```ts
import { resource } from '@warp-drive/schema';
import { TrailRunner } from './trail-runner';

export class InstagramAccount {
  @resource(TrailRunner) runner;
}
```

🌲 *TrailRunner*

```ts
import { resource } from '@warp-drive/schema';
import { InstagramAccount } from './instagram-account';

export class TrailRunner {
  @resource(InstagramAccount) instagram;
}
```

### LegacyCompat Mode

Support for migrating from `@warp-drive/legacy/model` on a more granular basis is provided by decorators that preserve the semantics of the quirks of that class. This allows you to begin eliminating models
and adopting other features of schemas sooner.

📸 *InstagramAccount*

```ts
import { belongsTo } from '@warp-drive/schema/legacy';
import { TrailRunner } from './trail-runner';

export class InstagramAccount {
  @belongsTo(TrailRunner, { inverse: "instagram" })
  runner;
}
```

🌲 *TrailRunner*

```ts
import { belongsTo } from '@warp-drive/schema/legacy';
import { InstagramAccount } from './instagram-account';

export class TrailRunner {
  @belongsTo(InstagramAccount, { inverse: "runner" })
  instagram;
}
```
