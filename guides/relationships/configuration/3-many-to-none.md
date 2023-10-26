# Many To None Relationships

- Previous ← [One To Many Relationships](./2-one-to-many.md)
- Next → [Many To One Relationships](./4-many-to-one.md)
- ⮐ [Relationships Guide](../../relationships.md)

---

Imagine our social network for trail runners 🏃🏃🏾‍♀️ allows runners to tag their activities. [#runday](https://www.instagram.com/explore/tags/runday/?hl=en) [#justdoit](https://www.instagram.com/explore/tags/justdoit/?hl=en)

In this model, the ActivityData might have multiple tags, but given that millions if not billions if not trillions of activities might use a tag like [#neverstopexploring](https://www.instagram.com/explore/tags/neverstopexploring/?hl=en), it turns out we definitely don't want the tag to keep track of every activity that ever referenced it.

```mermaid
graph LR;
    A(ActivityData) == tags ==> B(Hashtag)
```

> **Note** In our charts we use dotted lines for singular relationships and thick solid lines for collection relationships.

Often `ManyToNone` is used for exactly this sort of case, where conceptually the relationship is [many-to-many](./5-many-to-many.md) in nature, but one side would be so large that modeling it as such is prohibitive.

Here's how we can define such a relationship via various mechanisms.

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

🏷️ *Hashtag*

```ts
import Model, { attr } from '@ember-data/model';

export default class Hashtag extends Model {
  @attr name;
}
```

🏃🏾‍♀️ *ActivityData*

```ts
import Model, { hasMany } from '@ember-data/model';

export default class ActivityData extends Model {
  @hasMany('hashtag', { async: false, inverse: null })
  tags;
}
```

---

## Using JSON Schemas

EmberData doesn't care where your schemas come from, how they are authored,
or how you load them into the system so long as when it asks the [schema service](https://api.emberjs.com/ember-data/release/classes/SchemaService)
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
the The lack of an option like "async" or "inverse" as a false-y value.

We also are shifting the value for "kind" from "belongsTo" to "resource"
to make it more readil clear that relationships do not (by default) have
directionality or ownership over their inverse.

🏃🏾‍♀️ *ActivityData*

```json
{
  "kind": "collection",
  "name": "tags",
  "type": "hashtag",
}
```

---

## Using `@warp-drive/schema-record` (🚧 Coming Soon)

Working with schemas in a raw json format is far more flexible, lightweight and
performant than working with bulky classes that need to be shipped across the wire,parsed, and instantiated. Even relatively small apps can quickly find themselves shipping large quantities of JS just to describe their data.

No one wants to author schemas in raw JSON though (we hope 😬), and the ergonomics of typed data and editor autocomplete based on your schemas are vital to productivity and
code quality. For this, we offer a way to express schemas as typescript using types, classes and decorators which are then compiled into json schemas and typescript interfaces for use by your project.

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

Support for migrating from `@ember-data/model` on a more granular basis is provided by decorators that preserve the semantics of the quirks of that class. This allows you to begin eliminating models
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

---

- Previous ← [One To Many Relationships](./2-one-to-many.md)
- Next → [Many To One Relationships](./4-many-to-one.md)
- ⮐ [Relationships Guide](../../relationships.md)
