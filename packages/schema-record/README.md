<p align="center">
  <img
    class="project-logo"
    src="./logos/github-header.svg#gh-light-mode-only"
    alt="WarpDrive | Boldly go where no app has gone before"
    title="WarpDrive | Boldly go where no app has gone before"
    />
  <img
    class="project-logo"
    src="./logos/github-header.svg#gh-dark-mode-only"
    alt="WarpDrive | Boldly go where no app has gone before"
    title="WarpDrive | Boldly go where no app has gone before"
    />
</p>

<h3 align="center">Your Data, Managed.</h3>
<p align="center">🌲 Get back to Nature 🐿️ Or shipping 💚</p>

- ⚡️ Fast
- 📦 Tiny
- ✨ Optimized
- 🚀 Scalable
- ⚛️ Universal
- ☢️ Reactive

SchemaRecord is a reactive object that transforms raw data from an [associated cache](https://github.com/emberjs/data/blob/main/packages/core-types/src/cache.ts) into reactive data backed by Signals.

The shape of the object and the transformation of raw cache data into its
reactive form is controlled by a resource schema.

Resource schemas are simple JSON, allowing them to be defined and delivered from anywhere.

The capabilities that SchemaRecord brings to [*Warp***Drive**](https://github.com/emberjs/data/)
will simplify even the most complex parts of your app's state management.

## Installation

Install using your javascript package manager of choice. For instance
with [pnpm](https://pnpm.io/)

```cli
pnpm add @warp-drive/schema-record
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive/schema-record/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40warp-drive/schema-record/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40warp-drive/schema-record/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40warp-drive/schema-record/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40warp-drive/schema-record/lts-4-12?label=%40lts-4-12&color=bbbbbb)


## Getting Started

If this package is how you are first learning about WarpDrive/EmberData, we
recommend starting with learning about [Requests](https://github.com/emberjs/data/blob/main/packages/request/README.md)
and the [Store](https://github.com/emberjs/data/blob/main/packages/store/README.md).

## 🚀 Setup

SchemaRecord integrates with WarpDrive via the Store's resource lifecycle hooks.
When WarpDrive needs to create a new record instance to give reactive access to
a resource in the cache, it calls `instantiateRecord`. When it no longer needs
that instance, it will call `teardownRecord`.

```diff
import Store from '@ember-data/store';
+import { instantiateRecord, teardownRecord, registerDerivations, SchemaService } from '@warp-drive/schema-record';

class AppStore extends Store {

+  createSchemaService() {
+    const schema = new SchemaService();
+    registerDerivations(schema);
+    return schema;
+  }

+  instantiateRecord(identifier, createArgs) {
+    return instantiateRecord(this, identifier, createArgs);
+  }

+  teardownRecord(record) {
+    return teardownRecord(record);
+  }
}
```

Any Store API that returns a record instance will use the `instantiateRecord` 
hook configured above to instantiate a SchemaRecord once this is in place.
After that, its up to you what SchemaRecord can do.

## Start Using

### About

SchemaRecord is a reactive object that transforms raw data from an associated
cache into reactive data backed by Signals.

The shape of the object and the transformation of raw cache data into its
reactive form is controlled by a resource schema.

For instance, lets say your API is a [JSON:API](https://jsonapi.org) and your store is using the
JSONAPICache, and a request returns the following raw data:

```ts
{
  data: {
    type: 'user',
    id: '1',
    attributes: { firstName: 'Chris', lastName: 'Thoburn' },
    relationships: { pets: { data: [{ type: 'dog', id: '1' }] }}
  },
  included: [
    {
      type: 'dog',
      id: '1',
      attributes: { name: 'Rey' },
      relationships: { owner: { data: { type: 'user', id: '1' }}}
    }
  ]
}
```

We could describe the `'user'` and `'dog'` resources in the above payload
with the following schemas:

```ts
store.registerSchemas([
  {
    type: 'user',
    identity: { type: '@id', name: 'id' },
    fields: [
      {
        type: '@identity',
        name: '$type',
        kind: 'derived',
        options: { key: 'type' },
      },
      { kind: 'field', name: 'firstName' },
      { kind: 'field', name: 'lastName' },
      { 
        kind: 'derived',
        name: 'name',
        type: 'concat',
        options: { fields: ['firstName', 'lastName'], separator: ' ' }
      },
      {
        kind: 'hasMany',
        name: 'pets',
        type: 'pet',
        options: {
          async: false,
          inverse: 'owner',
          polymorphic: true,
          linksMode: true,
        }
      }
    ]
  },
  {
    type: 'dog',
    identity: { type: '@id', name: 'id' },
    fields: [
      {
        type: '@identity',
        name: '$type',
        kind: 'derived',
        options: { key: 'type' },
      },
      { kind: 'field', name: 'name' },
      {
        kind: 'belongsTo',
        name: 'owner',
        type: 'user',
        options: {
          async: false,
          inverse: 'pets',
          as: 'pet',
          linksMode: true,
        }
      }
    ]
  }
]);
```

With these schemas in place, the reactive objects that the store would
provide us whenever we encountered a `'user'` or a `'dog'` would be:

```ts

interface Pet {
  readonly id: string;
  readonly owner: User;
}

interface Dog extends Pet {
  readonly $type: 'dog';
  readonly name: string;
}

interface EditableUser {
  readonly $type: 'user';
  readonly id: string;
  firstName: string;
  lastName: string;
  readonly name: string;
  pets: Array<Dog | Pet>;
}

interface User {
  readonly $type: 'user';
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly name: string;
  readonly pets: Readonly<Array<Dog | Pet>>;
  [Checkout]: Promise<EditableUser>
}>
```

Note how based on the schema the reactive object we receive is able to produce
`name` on user (despite no name field being in the cache), provide `$type`
pulled from the identity of the resource, and flatten the individual attributes
and relationships onto the record for easier use.

Notice also how we typed this object with `readonly`. This is because while
SchemaRecord instances are ***deeply reactive***, they are also ***immutable***.

We can mutate a SchemaRecord only be explicitly asking permission to do so, and
in the process gaining access to an editable copy. The immutable version will
not show any in-process edits made to this editable copy.

```ts
import { Checkout } from '@warp-drive/schema-record';

const editable = await user[Checkout]();
```

### Utilities

SchemaRecord provides a schema builder that simplifies setting up a couple of
conventional fields like identity and `$type`. We can rewrite the schema
definition above using this utility like so:

```ts
import { withDefaults } from '@warp-drive/schema-record';

store.registerSchemas([
  withDefaults({
    type: 'user',
    fields: [
      { kind: 'field', name: 'firstName' },
      { kind: 'field', name: 'lastName' },
      { 
        kind: 'derived',
        name: 'name',
        type: 'concat',
        options: { fields: ['firstName', 'lastName'], separator: ' ' }
      },
      {
        kind: 'hasMany',
        name: 'pets',
        type: 'pet',
        options: {
          async: false,
          inverse: 'owner',
          polymorphic: true
        }
      }
    ]
  }),
  withDefaults({
    type: 'dog',
    fields: [
      { kind: 'field', name: 'name' },
      {
        kind: 'belongsTo',
        name: 'owner',
        type: 'user',
        options: {
          async: false,
          inverse: 'pets',
          as: 'pet',
        }
      }
    ]
  })
]);
```

Additionally, `@warp-drive/core-types` provides several utilities for type-checking and narrowing schemas.

- (type) [PolarisResourceSchema]()
- (type) [LegacyResourceSchema]()
- (type) [ObjectSchema]()
- [resourceSchema]()
- [objectSchema]()
- [isResourceSchema]()
- [isLegacyResourceSchema]()


### Field Schemas

For the full range of available schema capabilities, see [Field Schemas](../core-types/src/schema/fields.ts)


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
