# Many To Many Relationships

- Previous ← [Many To One Relationships](./4-one-to-many.md)
- ⮐ [Relationships Guide](../index.md)

---

Imagine our social network for trail runners 🏃🏃🏾‍♀️ allows runners to connect with friends, other trail runners!

```mermaid
graph LR;
    A(TrailRunner) <== friends ==> B(TrailRunner)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

Or, maybe more accurately since this is a [*reflexive*](../terminology.md#reflexive) relationship:

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

In the unidirectional configuration, we effectively have two separate distinct [many-to-none](./3-many-to-none.md) relationships.

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

Head over to [many-to-none](./3-many-to-none.md) if this is the setup that is best for you. Else, here's how we can define such a relationship via various mechanisms.

- [Using @ember-data/model](#using-ember-datamodel)
- [Using json schemas](#using-json-schemas)
- [🚧 Using @warp-drive/schema-record](#using-warp-driveschema-record-🚧-coming-soon)
  - [Legacy Compat Mode](#legacycompat-mode)

---

## Using `@ember-data/model`

> **Note** Models are currently the primary way that users of EmberData define "schema".
>
> Models are not the only way to define schema today, but they
> are the most immediately available ergonomic way to do so.

When using Models, EmberData parses schema from them at runtime,
converting static information defined on the class into the json
schema format needed by the rest of the system.

This is handled by the implementation of the [schema service](https://api.emberjs.com/ember-data/release/classes/SchemaService) provided
by the `@ember-data/model` package. The service converts the class
definitions into the json definitions described in the next section.

🌲 *TrailRunner*

```ts
import Model, { hasMany } from '@ember-data/model';

export default class TrailRunner extends Model {
  @hasMany('trail-runner', { inverse: 'friends', async: false })
  friends;
}
```

Note, the [many-to-none](./3-many-to-none.md) variation of this would be:

```ts
import Model, { hasMany } from '@ember-data/model';

export default class TrailRunner extends Model {
  @hasMany('trail-runner', { inverse: null, async: false })
  friends;
}
```

---

## Using JSON Schemas

EmberData doesn't care where your schemas come from, how they are authored,
or how you load them into the system so long as when it asks the [schema service](https://api.emberjs.com/ember-data/release/classes/SchemaService)
for information it gets back field definitions in the right json shape.

Here, we show how the above trail runner relationship is described by a field definition.

**Current**

🌲 *TrailRunner*

```json
{
  "kind": "hasMany",
  "name": "friends",
  "options": { "async": false, "inverse": "friends" },
  "type": "trail-runner",
}
```

Note, the [many-to-none](./3-many-to-none.md) variation of this would be:

```json
{
  "kind": "hasMany",
  "name": "friends",
  "options": { "async": false, "inverse": null },
  "type": "trail-runner",
}
```

**🚧 Coming Soon**

Because we deprecated implicit option values in 4.x, we are now able to change defaults.

This means that the next iteration of Schema will be able to reliably use
the The lack of an option like "async" or "inverse" as a false-y value.

We also are shifting the value for "kind" from "belongsTo" to "resource"
to make it more readil clear that relationships do not (by default) have
directionality or ownership over their inverse.

🌲 *TrailRunner*

```json
{
  "kind": "collection",
  "name": "friends",
  "options": { "inverse": "friends" },
  "type": "trail-runner",
}
```

Note, the [many-to-none](./3-many-to-none.md) variation of this would be:

```json
{
  "kind": "collection",
  "name": "friends",
  "type": "trail-runner",
}
```

---

## Using `@warp-drive/schema-record` (🚧 Coming Soon)

Working with schemas in a raw json format is far more flexible, lightweight and
performant than working with bulky classes that need to be shipped across the wire,parsed, and instantiated. Even relatively small apps can quickly find themselves shipping large quantities of JS just to describe their data.

No one wants to author schemas in raw JSON though (we hope 😬), and the ergonomics of typed data and editor autocomplete based on your schemas are vital to productivity and
code quality. For this, we offer a way to express schemas as typescript using types, classes and decorators which are then compiled into json schemas and typescript interfaces for use by your project.

🌲 *TrailRunner*

```ts
import { collection } from '@warp-drive/schema';

export class TrailRunner {
  @collection(TrailRunner, { inverse: "friends" })
  friends;
}
```

Note, the [many-to-none](./3-many-to-none.md) variation of this would be:

```ts
import { collection } from '@warp-drive/schema';

export class TrailRunner {
  @collection(TrailRunner) friends;
}
```

### LegacyCompat Mode

Support for migrating from `@ember-data/model` on a more granular basis is provided by decorators that preserve the semantics of the quirks of that class. This allows you to begin eliminating models
and adopting other features of schemas sooner.

🌲 *TrailRunner*

```ts
import { hasMany } from '@warp-drive/schema/legacy';

export class TrailRunner {
  @hasMany(TrailRunner, { inverse: "friends" })
  friends;
}
```

Note, the [many-to-none](./3-many-to-none.md) variation of this would be:

```ts
import { hasMany } from '@warp-drive/schema/legacy';

export class TrailRunner {
  @hasMany(TrailRunner) friends;
}

---

- Previous ← [Many To One Relationships](./4-one-to-many.md)
- ⮐ [Relationships Guide](../index.md)
