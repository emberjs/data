# LinksMode

---

**LinksMode** is a special feature that can be activated for any `belongsTo` or `hasMany` relationship.

It allows that relationship to be fetched using the standard `request` experience instead of via the legacy `adapter` interface.

LinksMode behaves *slightly* differently depending on whether
you are using Model (including via [LegacyMode](./4-reactivity/legacy/overview.md)) or [PolarisMode](./4-reactivity/polaris/overview.md). We'll explain this nuance below.

> [!TIP]
> The next-generation of reactive data which replaces Model is ReactiveResource.
> ReactiveResource has two modes, Legacy - which emulates all of Model's
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

<br>

### Related Links May Be Provided by Handlers

This means that, in order to use links mode, a relationship payload given to the cache MUST contain this related link. 

If your API does not provide this link, a [request handler](/api/@warp-drive/core/request/interfaces/Handler) could be utilized to decorate an API response to add them provided that your handlers (or your API) are able to understand that link.

Note that this approach can even work if your API requires you to send a POST request to fetch the relationship. [This blog post](https://runspired.com/2025/02/26/exploring-advanced-handlers.html) contains an overview of advanced request handling to achieve a similar aim for pagination.

<br>

### When a Relationship Is Fetched, the Related Link Is Used

Fetching a relationship via any of `relationship.reload`, `reference.reload`, `reference.load` or `await record.relationship` will issue a request to your handler chain. That request will look like the following:

```ts
interface FetchRelationshipRequest {
  op: 'findHasMany' | 'findBelongsTo';
  store: Store;
  url: string; // the related link
  method: 'GET';
  records: ResourceKey[]; // the current membership of the relationship
  data: {
    field: LegacyBelongsToField | LegacyHasManyField;
    links: Links;
    meta: Meta;
    options: unknown; // any options passed to `reload` or `load`
    record: ResourceKey; // the parent record
  };

  // tells the store to not automatically convert the response into something reactive
  // since the reactive relationship class itself will do that
  [EnableHydration]: false; 
}
```

The three most important things in this request are:

- the `op` code: this is how the cache will know to use the response to update the state of a relationship
- `data.field`: this is how the cache will know which field it should update
- `data.record`: this is how the cache will know which record to associate the response to.

The normalized API response (what your handler must return either directly from your API or with some normalization on the client) that should be passed to the JSON:API cache should be a standard JSON:API document.

The contents of `data` will be inserted into the resource cache and the list of records contained therein will be used to update the state of the relationship. The `meta` and `links` of the response will become the `meta` and `links` available for the
relationship as well.

Sideloads (included records) are valid to include in these responses.

<br>


## Activating LinksMode

LinksMode is activated by adding `linksMode: true` to the relationship's options.

Read on below for examples and nuances specific to Model vs ReactiveResource

<br>

### For a Relationship on a Model

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

This works for both `async` and `non-async` relationships and only changes the fetching behavior of the field it is defined on. For instance, in the example above, `homeAddress` is fetched in links mode while `<Address>.residents` might still be using the legacy adapter experience.

<br>

### For a ReactiveResource in LegacyMode

```ts
import type { ResourceSchema } from '@warp-drive/core-types/schema/fields';

const UserSchema = {
  type: 'user',
  // this is what puts the record instance into LegacyMode
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

The behavior of a relationship for a ReactiveResource in LegacyMode is always identical to that of a the same
relationship defined on a Model.

<br>

### For a ReactiveResource in PolarisMode

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

When using PolarisMode, `hasMany` and `belongsTo` relationships have additional constraints:

- 1. They MUST use linksMode. Nothing except linksMode is supported.
- 2. They MUST be `async: false`. Async relationships will never be supported in PolarisMode (read more on this below)
- 3. There is no `autofetch` behavior (because relationships are `async: false`)

You can load this link to fetch the relationship, though it is less easy to because the utility methods and links are
not as readily exposed via references as they are with Model.

For `belongsTo` this is a particularly large drawback. `belongsTo` has no mechanism by which to expose its links or a reload method. There are work arounds via the cache API / via derivations if needed, but cumbersome.

For `hasMany`, this restriction is not too difficult as it can be loaded via its link by calling `reload`, e.g. `user.friends.reload()`. As with hasMany in LegacyMode, its links are also available via `user.friends.links`.

This makes PolarisMode relationships intentionally limited. This limitation is not permanent – there is a replacement
in the works for `belongsTo` and `hasMany` that aligns relationships with the intended Polaris experience.

In the meantime, we've enabled synchronous linksMode relationships in order to allow folks to experiment with the polaris experience while still staying generally aligned with the direction relationships will evolve.

If this limitation is too great we would recommend continuing to use `LegacyMode` until the full story for 
relationships in PolarisMode is shipped.

<br>

---

#### What To Expect from PolarisMode Relationships in the Future

We intend to replace `belongsTo` and `hasMany` fields with the (as yet not implemented)
`resource` and `collection` fields.

These fields will have no `autofetch` behavior, and no async proxy. There will still be `sync` and `async`
variations of the field but this flag will take on a better meaning.

An `async` relationship represents a POTENTIALLY asynchronous boundary in your API, meaning that even if
sometimes the data for that relationship is included as a sideload, it may not always be and may require
its own request. Async collection relationships can be paginated.

A `sync` relationship represents an ALWAYS synchronous boundary, meaning that the full state of the relationship
is ALWAYS included as a sideload and cannot ever be loaded as its own request. Sync relationships can never be
paginated, and generally require use of a request which fetches their parent record to get updated state.

In LegacyMode, sync relationships gave direct access to the record or array while async relationships gave access
to a promisified proxy to the record/array.

In PolarisMode using `resource` and `collection`, sync relationships will also give direct access while async
relationships will instead provide access to a [ReactiveDocument](/api/@warp-drive/core/reactive/interfaces/ReactiveDocument).

So for instance, if `user.homeAddress` were `async: false`, then its value would be an instance of an `Address` record.
But if `user.homeAddress` were `asunc: true`, it would instead be a reactive class with `links`, `meta` and (only-if-loaded) `data`.

- `user.homeAddress.links` would provide access to its associated links
- `user.homeAddress.meta` would provide access to any associated meta
- `user.homeAddress.data` would provide access to the address record instance IF (and only if) the relationship data had been included as part of the response for a parent record previously OR fetched explicitly via its link.


