# LinksMode

- ⮐ [Relationships Guide](../index.md)

---

**LinksMode** is a special feature that can be activated for any `belongsTo` or `hasMany` relationship.

It allows that relationship to be fetched using the standard `request` experience instead of via the legacy `adapter` interface.

LinksMode behaves *slightly* differently depending on whether
you are using Model (including via [Legacy Mode](../../reactive-data/legacy/overview.md)) or [Polaris Mode](../../reactive-data/polaris/overview.md). We'll explain this nuance below.

> [!TIP]
> The next-generation of reactive data which replaces Model is SchemaRecord.
> SchemaRecord has two modes, Legacy - which emulates all of Model's
> behaviors and APIs, and Polaris - a new experience which we intend
> to make default in Version 6.

## Activating LinksMode

#### For A Relationship on a Model

Add `linksMode: true` to the relationship's options.

```ts
import Model, { belongsTo, hasMany } from '@ember-data/model';

export default class User extends Model {
  @belongsTo('address', {
    async: false,
    inverse: 'residents',
    linksMode: true
  })
  homeAddress;
}
```

This works for both `async` and `non-async` relationships and only changes the fetching behavior the field it is defined on. So for instance, in the example above, `homeAddress` is fetched in links mode while `<Address>.residents` might still be using the legacy adapter experience.

#### For A SchemaRecord in LegacyMode

```ts
import type { ResourceSchema } from '@warp-drive/core-types/schema/fields';

const UserSchema = {
  type: 'user',
  // this is what puts the record instance into legacy mode
  legacy: true,
  fields: [
    {
      kind: 'belongsTo',
      name: 'homeAddress',
      options: {
        async: false,
        inverse: 'residents',
        linksMode: true
      }
    }
  ]
} satisfies ResourceSchema;
```

The behavior of relationships for a SchemaRecord in LegacyMode is always identical to that of Model's.

#### For A SchemaRecord in PolarisMode

```ts
import type { ResourceSchema } from '@warp-drive/core-types/schema/fields';

const UserSchema = {
  type: 'user',
  fields: [
    {
      kind: 'belongsTo',
      name: 'homeAddress',
      options: {
        async: false,
        inverse: 'residents',
        linksMode: true
      }
    }
  ]
} satisfies ResourceSchema;
```

The only difference here is that we don't mark the resource schemas as `legacy`. This puts us in the standard/default mode (`polaris`);

Async relationships are not supported in Polaris mode!
