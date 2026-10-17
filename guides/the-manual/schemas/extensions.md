---
description: Placeholder for the guide to schema extensions, which add custom methods and properties to reactive arrays, objects, and resources during migration; no content yet.
---

# Extensions

> ⚠️ **Note:** Extensions exist only as a **temporary bridge** for apps migrating from legacy model classes to the schema-driven WarpDrive system.  
> They should not be used in new code.

Extensions let you attach existing **class logic**, such as computed properties, methods, and other behavior, to a [ResourceSchema](/guides/the-manual/schemas/resource-schemas).  
They act as a compatibility layer during migration, allowing you to reuse your old model classes while gradually moving logic into Derivations, Traits, or Transformations.

## Why Extensions Exist

When migrating large applications, rewriting all model logic at once can be risky and time-consuming.  
Extensions make this process smoother by letting you reuse existing class methods while adopting ResourceSchemas.  
This helps you move to the new system incrementally without breaking existing behavior.

Once your schema-based setup is stable, you can remove Extensions and move that logic into proper schema concepts.

## Defining and Registering an Extension

Extensions are registered using the [`CAUTION_MEGA_DANGER_ZONE_registerExtension`](https://canary.warp-drive.io/api/@warp-drive/core/types/schema/schema-service/interfaces/SchemaService#caution_mega_danger_zone_registerextension) method on the schema service.  
Each Extension is linked by name and can then be referenced by any schema that uses it.

```ts [store/index.ts]
import { store } from './store';
import { User } from './models/user';

store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
  kind: 'object',
  name: 'user:extension',
  features: User
});
```

## Using an Extension in a Schema

Once registered, you can reference the Extension in your ResourceSchema using the [`objectExtensions`](https://canary.warp-drive.io/api/@warp-drive/core-types/schema/fields/interfaces/ObjectField#objectextensions) array.

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'field' },
    { name: 'lastName', kind: 'field' },
    { name: 'friends', kind: 'collection', type: 'user', options: { async: false, inverse: 'friends' } }
  ],
  objectExtensions: ['user:extension']
});
```

This tells WarpDrive to attach the logic from your `User` class to the schema-backed resource.

## Example: Migrating a Legacy Model

```ts [models/user.ts]
import { attr, hasMany } from '@ember-data/model';
import Entity from './entity';

export default class User extends Entity {
  @attr firstName;
  @attr lastName;
  @hasMany('user', { async: false, inverse: 'friends' }) friends;

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get bestFriendNames() {
    return this.friends
      .filter(f => f.firstName.includes('a'))
      .map(f => f.fullName)
      .sort();
  }

  async updateEntityName() {
    await doComplicatedThing(this);
  }
}
```

You can now reuse this logic without refactoring everything immediately:

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'field' },
    { name: 'lastName', kind: 'field' },
    { name: 'friends', kind: 'collection', type: 'user', options: { async: false, inverse: 'friends' } }
  ],
  objectExtensions: ['user:extension']
});
```

Your `User` class methods (`fullName`, `bestFriendNames`, `updateEntityName`) continue to work, but are now layered on top of the new WarpDrive data model.

## When to Remove Extensions

Extensions are meant to be temporary.  
You can remove them once your logic has been fully migrated to the schema-based approach.

At that point:
- Move computed or reactive fields into **Derivations**  
- Move reusable field groups into **Traits**  
- Move data conversions into **Transformations**  

Once your schemas cover everything, you can safely remove the extension registration and delete the legacy class.

By using Extensions strategically, you can migrate complex model logic gradually while adopting WarpDrive’s schema-driven data layer with minimal disruption.
