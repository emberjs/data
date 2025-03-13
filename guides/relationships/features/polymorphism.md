# Relationship Polymorphism

- ⮐ [Relationships Guide](../index.md)

---

Polymorphic relationships are relationships where the value can be more than one
type of resource.

For instance, say a human has pets, where a pet can be any furry friend:

```ts
interface Human {
  pets: FurryFriend[];
}
```

That furry friend may be a cat, a zebra, a monkey or best a dog! Each furry friend comes with
their own unique characteristics and personalities, but they have one thing in common: YOU.

```ts
interface FurryFriend {
  owner: Human;
}

interface Cat extends FurryFriend {
  color: 'calico' | 'tabby' | 'black';
  personality: 'indoor' | 'outdoor';
  name: 'you only wish you knew';
}

interface Zebra extends FurryFriend {
  speed: number;
  weight: number;
  name: string;
}

interface Monkey extends FurryFriend {
  throwPoop: boolean;
  stealsHats: boolean;
  sitsOnShoulder: boolean;
  bananaCache: number;
}

interface Dog extends FurryFriend {
  isGood: true;
  goesToHeaven: 'always';
}
```

It isn't very useful to think of your pets as just furry friends, because you want to use the unique
characteristics of each. In reality, our relationship is a union:

```ts
interface Human {
  pets: Array<Cat | Zebra | Monkey | Dog>;
}
```

We can look at each pet and immediately see their distinctly loveable traits.

Of course, sometimes we're a bit too giving of our love and accept anything that shows up at our door, in
our car, above our kitchen cabinent, or in our attic as our pet. We can model that too:

```ts
interface Human {
  pets: unknown[];
}
```

## How To Implement

WarpDrive implements polymorphism structurally: as long as records on both sides of the relationship agree
to the same structural contract, it works. In other words, you do not need inheritance, mixins, decorators
or any other compositional primitive to achieve polymorphism (though sometimes these compositional patterns are useful in their own right).

There are two polymorphic modes in WarpDrive:

- **open** - any type of record can be a value (this is like our last example above of `pets: unknown[]`)
- **closed** - only types of records that conform to a specific contract can be a value

### Open Polymorphism

To make any relationship an open polymorphic relationship, its options should include both `inverse: null` and 
`polymorphic: true`. The related type can be any meaningful string, and does not need to be a resource type
ever encountered.

So for instance, to implement our pets relationship using open polymorphism using `Model`:

```ts
import Model, { hasMany } from '@ember-data/model';

export default class Human extends Model {
  @hasMany('abstract-pet', { async: false, inverse: null, polymorphic: true })
  declare pets: unknown[];
}
```

That same relationship using a schema:

```ts
store.schema.registerResource({
  type: 'human',
  identity: { kind: '@id', name: 'id' },
  fields: [
    {
      kind: 'hasMany',
      name: 'pets',
      type: 'abstract-pet',
      options: {
        async: false,
        inverse: null,
        polymorphic: true
      }
    }
  ]
})
```

### Closed/Structural Polymorphism

To make any relationship a closed polymorphic relationship based on structural contract, its options should
include both an explicit non-null inverse and `polymorphic: true`.

The related type can be any meaningful string, and does not need to be a resource type ever encountered.

The inverse relationship on any record looking to adhere to the structural contract MUST be implemented
exactly the same each time.

So for instance, to implement our pets relationship using closed polymorphism using `Model`:


```ts
import Model, { hasMany } from '@ember-data/model';

export default class Human extends Model {
  @hasMany('abstract-pet', { async: false, inverse: 'owner', polymorphic: true })
  declare pets: Array<Cat | Zebra | Monkey | Dog>
}
```

And on *every* model that can be a pet, this same relationship as shown below for cat:

```ts
import Model, { belongsTo } from '@ember-data/model';

export default class Cat extends Model {
  @belongsTo('human', { async: false, inverse: 'pets', as: 'abstract-pet' })
  declare owner: Human;
}
```

By "same" we mean the entirety of the below with zero changes:

```ts
  @belongsTo('human', { async: false, inverse: 'pets', as: 'abstract-pet' })
  declare owner: Human;
```

E.g. if the relationship is `async: false` it must always be `async: false`, if it is named `owner` it must
always be named `owner`, if it is a `belongsTo` is must always be a `belongsTo` and so-on.

Enforcing this consistency is why often teams will choose to use a class decorator, inheritance or similar
as a compositional pattern to provide the relationship definition. But it is not the mechanism of composition
but the shape of the field that actually drives the behavior.

For completeness: the above relationships using schemas:

```ts
store.schema.registerResources([
  {
    type: 'human',
    identity: { kind: '@id', name: 'id' },
    fields: [
      {
        kind: 'hasMany',
        name: 'pets',
        type: 'abstract-pet',
        options: {
          async: false,
          inverse: 'owner',
          polymorphic: true
        }
      }
    ]
  },
  {
    type: 'cat',
    identity: { kind: '@id', name: 'id' },
    fields: [
      {
        kind: 'belongsTo',
        name: 'owner',
        type: 'human',
        options: {
          async: false,
          inverse: 'pets',
          as: 'abstract-pet'
        }
      }
    ]
  },
]);
```

In the schema approach, the entirety of the below field definition is what must be the same on each resource
schema:

```js
 {
  kind: 'belongsTo',
  name: 'owner',
  type: 'human',
  options: {
    async: false,
    inverse: 'pets',
    as: 'abstract-pet'
  }
}
```

## Fetching Polymorphic Data

When working with a polymorphic relationship, the resource data for each related resource
should use its concrete type, not the abstract type.

For instance, `cat` in our example is a concrete type, while `abstract-pet` is the abstract type.

The happy path for polymorphism is to always use the concrete type when possible in relationship and resource data.

But if your app does not take the happy path, all is not lost!

It is fine to request data via the abstract type provided the API response returns the concrete types. Most of the time WarpDrive will just do the right thing and understand what you did.

Figuring out "the right thing" even extends to automatically detecting and upgrading the identity of a record
from the abstract type to the concrete type.

For instance: say you said you had one pet in your pets relationship, specified as `{ type: 'abstract-pet', id: '1' }`.
For whatever reason, at the point you got this data the concrete type was unknown. Later, you make a request to get this data:

```ts
await store.request(findRecord('abstract-pet', '1'));

/* response json
=> {
  data: {
    type: 'dog',
    id: '1',
    attributes: { ... }
  }
}
*/
```

The response returns a resource with the type `'dog'` (still with id `'1'`). This is what is often referred to as
single-table polymorphism (single shared id index, multiple potential types). By default, WarpDrive will *usually* 
recognize that `'abstract-pet'` was the abstract type and upgrade the type to `'dog'`, ensuring any relationships
that relate to `{ type: 'abstract-pet', id: '1' }` point at the dog resource.

When WarpDrive doesn't get it right, or when your API uses multi-table polymorphism and exposes relationships via the abstract and not the concrete type, there are several escape valves to be aware of.

- 1) Your most powerful ally is requests and request handlers. You can post-process responses and convert the concrete types back to abstract types in relationships and assign the `lid` of the abstract type to the resource so that the cache understands to associated the abstract identity to the concrete identity.
- 2) Alternatively (or in conjunction with option 1) you can implement the identity generation hook to teach the cache how to understand which identities are actually the same identity. This generally works best in scenarios where `id` is
globally unique (such as a uuid).
