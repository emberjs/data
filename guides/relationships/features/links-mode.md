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

## How Does It Work?

### Related Link Becomes Required

Relationships in WarpDrive are stored using the same top-level structure as resource documents, a structure
adopted from the [JSON:API](https://jsonapi.org) specification.

- **data**: the membership (state of) the relationship
- **links** *(optional)*: an object containing various links for fetching and managing the relationship
- **meta** *(optional)*: an object of arbitrary extra information about the relationship

This is roughly described by the interface below:

```ts
interface Relationship {
  meta?: Record<string, Value>;
  links?: Links;
}

interface ResourceRelationship extends Relationship {
  data: { type: string; id: string | null; lid: string } | null;
}

interface CollectionRelationship extends Relationship {
  data: { type: string; id: string | null; lid: string }[]
}
```

When `linksMode` is activated for a relationship, it is required that a related link is present.

```ts
interface LinksModeRelationship {
  meta?: Record<string, Value>;

  // no longer optional
  links: {
    related: string | { href: string };

    // other links as desired
  }
}
```

### Related Links May Be Provided by Handlers

This means that, in order to use links mode, a relationship payload given to the cache MUST contain this related link. If your API does not provide this link, a request handler could be utilized to decorate an API response to add them provided that your handlers (or your API) are able to understand that link.

### When a Relationship Is Fetched, the Related Link Is Used

Fetching a relationship via any of `relationship.reload`, `reference.reload`, `reference.load` or `await record.relationship` will issue a request to your handler chain. That request will look like the following:

```ts
interface FetchRelationshipRequest {
  op: 'findHasMany' | 'findBelongsTo';
  store: Store;
  url: string; // the related link
  method: 'GET';
  records: StableRecordIdentifier | StableRecordIdentifier[] | null; // the current membership of the relationship
  data: {
    useLink: true;
    field: LegacyBelongsToField | LegacyHasManyField;
    links: Links;
    meta: Meta;
    options: unknown; // any options passed to `reload` or `load`
    record: StableRecordIdentifier; // the parent record
  };

  // tells the store not to automatically convert the response into something reactive
  // since the reactive relationship class itself will do that
  [EnableHydration]: false; 
}
```

The three most important things in this request are:

- the `op` code: this is how the cache will know to use the response to update the state of a relationship
- `data.field`: this is how the cache will know which field it should update
- `data.record`: this is how the cache will know which record to associate the response to.

The normalized API response (what your handler must return either directly from your API or with some normalization on the client) that should be passed to the JSON:API cache should be a standard JSON:API document.

The contents of `data` will be inserted into the resource cache and the list of records contained used to update the state of the relationship. The `meta` and `links` of the response will become the `meta` and `links` available for the
relationship as well.

Sideloads (included records) are valid to include in these response.

## Activating LinksMode

### For A Relationship on a Model

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

This works for both `async` and `non-async` relationships and only changes the fetching behavior of the field it is defined on. So for instance, in the example above, `homeAddress` is fetched in links mode while `<Address>.residents` might still be using the legacy adapter experience.

### For A SchemaRecord in LegacyMode

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

### For A SchemaRecord in PolarisMode

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

**Async relationships are not (currently) supported in Polaris mode!** This aligns with the general direction of 
the (as yet not implemented) `resource` and `collection` fields which replace `belongsTo` and `hasMany`.

Polaris mode relationhip fields have no `autofetch` behavior.

In the future, a `non-async` resource or collection field would refer to a relationship that is both *always*
included within the parent of another record AND *never directly retreivable via its own endpoint* (e.g. to get
the updated state for the relationship would require reloading the request that delivered the parent record).

A `non-async` resource or collection would behave very similarly to `sync` hasMany/belongsTo relationships in that
the field would give direct access to the value. E.G. `user.homeAddress` would be an address record instance.

Meanwhile in the future an `async` resource or collection field would refer to a relationship that *may or may not*
be included in the response containing a parent record and which can be retreived via its own link.

An `async` resource or collection would look and behave like a request's response document. `user.homeAddress.links`
would provide access to its associated links, `user.homeAddress.meta` would provide access to any associated meta and
`user.homeAddress.data` would provide access to the address record instance IF (and only if) the relationship data had been included as part of the response for a parent record previously OR fetched explicitly via its link.

For now, until we implement `resource` and `collection`, we are allowing use of `belongsTo` and `hasMany` in a synchronous mode only. These relationships MUST be put `linksMode`.

`hasMany` can be loaded via its link by calling `reload`, e.g. `user.friends.reload()`. As with hasMany in legacy-mode, its links are also available via `user.friends.links`.

`belongsTo` has no mechanism by which to expose its links or a reload method.

