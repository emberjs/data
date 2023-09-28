<p align="center">
  <img
    class="project-logo"
    src="./NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">Your data, managed.</h3>
<p align="center">🌲 Get back to Nature 🐿️ Or shipping 💚</p>

SchemaRecord is:
- ⚡️ Fast
- 📦 Tiny
- ✨ Optimized
- 🚀 Scalable
- :electron: Universal

Never write a Model again.

This package provides presentation capabilities for your resource data. It works together with an [*Ember***Data**](https://github.com/emberjs/data/) [Cache](https://github.com/emberjs/data/blob/main/ember-data-types/cache/cache.ts) and associated Schemas to simplify the most complex parts of your state management.

## Installation

> ⚠️ Private

This package may currently only be used within EmberData. A public version is coming soon 💜

#### 🔜 Soon 
Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @warp-drive/schema-record
```

## Getting Started

If this package is how you are first learning about EmberData, we recommend starting with learning about the [Store](https://github.com/emberjs/data/blob/main/packages/store/README.md) and [Requests](https://github.com/emberjs/data/blob/main/packages/request/README.md)

## 🚀 Setup

SchemaRecord integrates with EmberData via the Store's resource lifecycle hooks.
When EmberData needs to create a new presentation class to pair with some resource
data, it calls `instantiateRecord`. When it no longer needs that class, it will call
`teardownRecord`.

```ts
import Store from '@ember-data/store';
import SchemaRecord from '@warp-drive/schema-record';
import Cache from '@ember-data/json-api';

const DestroyHook = Symbol.for('destroy');

export default class extends Store {
  instantiateRecord(identifier) {
    return new SchemaRecord(this, identifier);
  }

  teardownRecord(record: SchemaRecord): void {
    record[DestroyHook]();
  }
}
```

## Start Using

Any Store method that returns records will use SchemaRecord once configured as above.
After that, its up to you what SchemaRecord can do.

SchemaRecord's behavior is driven by the Schemas you register with the Store's Schema
Service. Schemas are simple json objects that follow a pattern.

You could manually construct schemas, though that would be laborious. We recommend 
compiling schemas from another available source such as your API's types. If you don't
have a source from which to compile schemas, consider using `@warp-drive/schema-dsl`.

The Schema DSL allows authoring rich, expressive schemas using familiar Typescript and
Decorators, which compile at build into json schemas you can deliver to your app either
in your asset bundle, via a separate fetch, or from your API.

The Schema DSL will also compile and register types for your schemas that give you robust
typescript support.

## Main Paradigms

### Immutability

SchemaRecord is Immutable. This means by design you cannot mutate a SchemaRecord instance.

How then do you make edits and preserve changes?

### Mutation Workflows

Edits are performed in mutation workflows. A workflow is begun by forking the store.
Forks are cheap copy-on-write scopes that allow you to make changes in isolation without
affecting the global state of the application (until you want to). You can even fork forks, though its probably not that useful to do so in the common case.

```ts
const fork = await store.fork();
```

Forks are not themselves editable, they are just a pre-requisite.
There are three ways to get an editable SchemaRecord instance.

1. Create a new record with `const editable = fork.createRecord(<type>, data)`
2. Checkout an existing record in edit mode: `const editable = fork.checkoutRecord(record)`
3. Access a related record on a record already in edit mode: `const editableFriend = editable.bestFriend`

If you decide you want to discard your changes, there's no need to rollback. Simply
dereferencing the fork and any records you've received from it will cause it to GC.

However, explicitly calling `fork.deref()` will ensure that if you did forget to dereference
any records and left them around somewhere as a variable, they'll blow up with a useful
error if used again.

To save changes, call `fork.request(saveRecord(editable))`. Saving changes will only commit
the changes to the fork, it won't commit them upstream. To reflect the changes upstream, call
`await fork.merge(store)`. In most cases, `store` should be the store you forked from, though
it is allowed to attempt to merge into a parent `store` as well.

```ts
// get a fork for editing
const fork = await store.fork();

// create a new record
const user = fork.createRecord('user', { name: 'Chris' });

// save the record
await fork.request(createRecord(user));

// reflect the changes back to the original store
await store.merge(fork);
```

> Note: merging behavior is determined by the Cache implementation. The implementations
> maintained by the EmberData team will merge both persisted and unpersisted changes back
> to the upstream (preserving them as remote and local state respectively). This approach
> allows developers to choose to optimistically vs pessimistically update the global state.

### Optimistic UX

```ts
// get a fork for editing
const fork = await store.fork();

// create a new record
const user = fork.createRecord('user', { name: 'Chris' });

// reflect the (dirty) changes back to the original store
await store.merge(fork);

// save the record
await fork.request(createRecord(user));

// reflect the (clean) changes back to the original store
await store.merge(fork);
```

## Schema Format

The schema format is the array representation of a Map structure. From which
we will populate or append to a Map!

```ts
[
  [ 'user', <user-schema> ],
  [ 'company', <company-schema> ],
]
```

It follows this signature:

```ts
type ResourceType = string; // 'user'
type FieldName = string; // 'name'
type FieldDef = {
  name: string;
  type: string | null;
  kind: 'resource' | 'collection' | 'attribute' | 'derivation' | 'object' | 'array';
  options: Record<string, unknown>;
};

type ResourceSchema = Array<[FieldName, FieldDef]>
type Schemas = Array<[ResourceType, ResourceSchema]>
```

You'll find this syntax is capable of describing most conceivable behaviors, including
some emergent ones we're sure we haven't thought of yet.


### ♥️ Credits

 <details>
   <summary>Brought to you with ♥️ love by <a href="https://emberjs.com" title="EmberJS">🐹 Ember</a></summary>

  <style type="text/css">
    img.project-logo {
       padding: 0 5em 1em 5em;
       width: 100px;
       border-bottom: 2px solid #0969da;
       margin: 0 auto;
       display: block;
     }
    details > summary {
      font-size: 1.1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details {
      font-size: 1rem;
    }
    details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #000;
      border-bottom: 3px solid #0969da;
    }

    details > details {
      margin-left: 2rem;
    }
    details > details > summary {
      font-size: 1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details > details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #555;
      border-bottom: 2px solid #555;
    }
    details > details {
      font-size: .85rem;
    }

    @media (prefers-color-scheme: dark) {
      details > summary strong {
        color: #fff;
      }
    }
    @media (prefers-color-scheme: dark) {
      details > details > summary strong {
        color: #afaba0;
      border-bottom: 2px solid #afaba0;
      }
    }
  </style>
</details>
