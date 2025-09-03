# LegacyMode

- ⮐ [ReactiveData](../index.md)

---

ReactiveResource has two modes: `legacy` and `polaris`.

**LegacyMode** can be used to emulate the behaviors and capabilities of The `Model` class from `@ember-data/model` that was the default way to define reactive objects with schemas for much of WarpDrive's history.

The advantage of using ReactiveResource in LegacyMode is that it allows adopting many newer schema-driven behaviors before fully refactoring away from behaviors of Model that aren't supported by PolarisMode.

Because there is little-to-no distinction between the base features of Model and ReactiveResource in LegacyMode we refer to both of these approaches as LegacyMode. This mode remains the default experience in V5.

## Feature Overview

In LegacyMode:

- records are mutable
- local changes immediately reflect app wide
- records have all the APIs of Model (references, state props, currentState, methods etc)
- limited reactivity for attribute fields (same as Model)
- the continued use of `@ember-data/model` and `@ember-data/legacy-compat` packages is required (though most imports from them can be removed)
- `async: true` relationships are supported (but not recommended outside of [LinksMode](https://github.com/emberjs/data/blob/main/guides/relationships/features/links-mode.md))


## Usage with ReactiveResource

### Installation

Ensure the following packages are installed:

- `@warp-drive/schema-record`
- `@ember-data/model`
- `@ember-data/legacy-compat`

> [!TIP]
> Not sure what other packages you need? We're [working to simplify installation and setup](https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/) but until then [this guide explains when various packages are necessary]().

### Configuration

LegacyMode works by defining a series of derived fields on a resource's schema that replicate the behaviors of
Model from `@ember-data/model` exactly. This is done by sharing the underlying implementation code of
these features that Model also uses, and thus for as long as your application uses records in LegacyMode
the `@ember-data/model` and `@ember-data/legacy-compat` packages must be installed.

The derivations for these fields need to be registered with the schema service.

```ts
import { registerDerivations } from '@ember-data/model/migration-support';

// ... somewhere with access to the store

registerDerivations(store.schema);
```

A common way to do this is to register the derivations while initializing the schema service.

```ts
import Store from '@ember-data/store';
import { SchemaService } from '@warp-drive/schema-record';
import { registerDerivations } from '@ember-data/model/migration-support';

export default class AppStore extends Store {
  // ... other config

  createSchemaService() {
    const schema = new SchemaService();
    registerDerivations(schema);
    return schema;
  }
}

```

### Defining Legacy Schemas

Below we show both how to define a resource schema in LegacyMode and how to obtain a type
for a record that contains the types for these legacy fields and methods:

```ts
import { withDefaults, WithLegacy } from '@ember-data/model/migration-support';
import { Type } from '@warp-drive/core-types/symbols';
import type { HasMany } from '@ember-data/model';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'attribute' },
    { name: 'lastName', kind: 'attribute' },
    { name: 'age', kind: 'attribute' },
    { name: 'friends',
      kind: 'hasMany',
      type: 'user',
      options: { inverse: 'friends', async: false }
    },
    { name: 'bestFriend',
      kind: 'belongsTo',
      type: 'user',
      options: { inverse: null, async: false }
    },
  ],
});

export type User = WithLegacy<{
  firstName: string;
  lastName: string;
  age: number;
  friends: HasMany<User>;
  bestFriend: User | null;
  [Type]: 'user';
}>
```

### Migration

Several migration paths from Models to PolarisMode records exist.

- [The Two Store Approach](../../migrating/two-store-migration.md) enables migrating while also upgrading versions and starting relatively fresh. This enables the same resource type (for instance `user`) to be used in legacymode in some areas of the app and in polaris mode in others by sourcing data from separately
configured store instances.
- **The Jump To ReactiveResource Approach** is best for apps that do not have many properties or methods on models beyond `attr` `belongsTo` and `hasMany` defined fields. In this approach, all models are converted to types and schemas in LegacyMode in one push.
- **The Incremental Model Migration Approach** is best for apps that have added complex logic, computed fields, methods, and overrides to their Models. Models and ReactiveResources can work with each other, including via relationships. In this approach, all records for each `type` of resource will always be either a legacy `Model` instance or a `ReactiveResource` instance depending on if the resource has been migrated yet or not. The store's schema service is configured to understand both Models and raw schemas as sources of schema, and is configured to instantiate model classes.

We have ideas on several additional incremental migration paths we might add in the near future, including adding decorators that support new field kinds that can be used with `Model`, and a new utility class that would let you proxy an underlying schema-record but wrap it with properties and methods you'd previously added to your Model definitions. Both of these approaches would similarly be intended to support temporary transition states while working towards all of your data being used in [PolarisMode](../polaris/overview.md).
