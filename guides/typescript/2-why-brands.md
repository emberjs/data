# EmberData's Types Strategy

If you previously used the EmberData types provided by DefinitelyTyped, one MASSIVE
difference you will notice immediately is that EmberData does not use any registries
for types.

Instead, EmberData uses Symbol keys to brand objects with additional type information.

For example:

```ts
import Model, { attr } from '@ember-data/model';
import { ResourceType } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @attr declare name: string;

  [ResourceType] = 'user' as const;
}
```

This means that when calling an API that takes in a resource type, we pass this branded class as a generic instead of relying on registries. For example:

```ts
import type User from 'my-app/models/user';

// ...

const user = await store.findRecord<User>('user', '1');
```

We chose this direction over registries or objects for a number of reasons we'll detail below.

### Why not registries?

We found registries had 5 significant drawbacks.

First, registries have a max number of entries before TypeScript begins resolving unions based on the registry as `any`. This limit is relatively low (in the hundreds) so many applications hit into this relatively quickly.

Second, constructing registries is brittle. Conflicts often arise when attempting to source models from additional libraries, and often result in `never` types due to an empty registry.

Third, we couldn't type EmberData itself using registries without adopting extreme complexity. This is because while DefinitelyTyped could assume one single global registry, EmberData cannot. This arises for a myriad of reasons: EmberData supports multiple stores, multiple sources of schema, and our own test suite defines Models for each test that would conflict with each other if we were forced to use a single global registry.

Fourth, and possibly most importantly, registries assume that for a given resource-type (like `'user'`) that only a single type signature exists. While this has *mostly* been true historically in EmberData, it is no longer true and will become increasingly less true as we roll out additional features we have planned. Supporting different
type signatures for Create/Edit/Delete as well as for partials and actions means if we stuck with registries, we'd need tons of them and things would get complicated quickly.

Fifth, the registry approach prevents static analysis from easily determining where in the application a Model or Schema is in use, making it difficult for bundlers to
optimize while code-splitting.

### Ok, so then why not objects?

A common alternative to registries is to pass classes as tokens into an API. For instance, we could have redesigned
EmberData to take a class instead of a string in the call to `findRecord` below.

```ts
import type User from 'my-app/models/user';

// ...

const user = await store.findRecord(User, '1');
```

There are two significant drawbacks to this approach. The first is one of the same reasons as "why not registries": we expect that lots of type signatures will satisfy a single resource-type in the future.

The second is related and more important: it forces you to use classes or other objects to represent data, which we don't want to do.

In the near future, EmberData will switch the default story for presenting data from `Model` which is a class-per-resource approach to `SchemaRecord`, which is a single class capable of presenting the data for any associated schema. Schema's are defined in `json` and can be loaded into the app in any number of ways. That means when using SchemaRecord, there never would be a class to import and use as a token for such a call.

### Ok, Brands!

Brands solve the various issues mentioned above, and a bit more!

Over time, they should enable us to curate a great experience for working with partials, actions, contrained edit signatures, query syntaxes like GraphQL and more.
