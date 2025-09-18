---
title: Migrating
outline:
  level: 2,3
---

# Migrating 4.x to 5.x

## Pre-Migration (update to Native Types)

If you use Typescript, before migrating, you should update your types to WarpDrive's native types.

### Step 1 - delete all the ember/ember-data DT type packages

```package.json
{
  "dependencies": { 
    "@types/ember": "4.0.11", // [!code --:25]
    "@types/ember-data": "4.4.16",
    "@types/ember-data__adapter": "4.0.6",
    "@types/ember-data__model": "4.0.5",
    "@types/ember-data__serializer": "4.0.6",
    "@types/ember-data__store": "4.0.7",
    "@types/ember__application": "4.0.11",
    "@types/ember__array": "4.0.10",
    "@types/ember__component": "4.0.22",
    "@types/ember__controller": "4.0.12",
    "@types/ember__debug": "4.0.8",
    "@types/ember__destroyable": "4.0.5",
    "@types/ember__engine": "4.0.11",
    "@types/ember__error": "4.0.6",
    "@types/ember__helper": "4.0.7",
    "@types/ember__modifier": "4.0.9",
    "@types/ember__object": "4.0.12",
    "@types/ember__owner": "4.0.9",
    "@types/ember__routing": "4.0.22",
    "@types/ember__runloop": "4.0.10",
    "@types/ember__service": "4.0.9",
    "@types/ember__string": "3.16.3",
    "@types/ember__template": "4.0.7",
    "@types/ember__test": "4.0.6",
    "@types/ember__utils": "4.0.7",
  }
}
```

### Step 2 - install the `@ember-data-types/*` `@warp-drive-types/*` and  `ember-data-types` packages as necessary using the latest versions.

::: code-group

```sh [pnpm]
pnpm add -E ember-data-types@canary @ember-data-types/request@canary @ember-data-types/adapter@canary @ember-data-types/serializer@canary @ember-data-types/store@canary @ember-data-types/graph@canary @ember-data-types/json-api@canary @ember-data-types/legacy-compat@canary @ember-data-types/model@canary @warp-drive-types/core-types@canary
```

```sh [npm]
npm add -E ember-data-types@canary @ember-data-types/request@canary @ember-data-types/adapter@canary @ember-data-types/serializer@canary @ember-data-types/store@canary @ember-data-types/graph@canary @ember-data-types/json-api@canary @ember-data-types/legacy-compat@canary @ember-data-types/model@canary @warp-drive-types/core-types@canary
```

```sh [yarn]
yarn add -E ember-data-types@canary @ember-data-types/request@canary @ember-data-types/adapter@canary @ember-data-types/serializer@canary @ember-data-types/store@canary @ember-data-types/graph@canary @ember-data-types/json-api@canary @ember-data-types/legacy-compat@canary @ember-data-types/model@canary @warp-drive-types/core-types@canary
```

```sh [bun]
bun add --exact ember-data-types@canary @ember-data-types/request@canary @ember-data-types/adapter@canary @ember-data-types/serializer@canary @ember-data-types/store@canary @ember-data-types/graph@canary @ember-data-types/json-api@canary @ember-data-types/legacy-compat@canary @ember-data-types/model@canary @warp-drive-types/core-types@canary
```

:::

### Step 3 - configure tsconfig.json

```diff
 {
   "compilerOptions": {
     "types": [
        "ember-source/types", // [!code ++:12]
        "ember-data-types/unstable-preview-types",
        "@ember-data-types/store/unstable-preview-types",
        "@ember-data-types/adapter/unstable-preview-types",
        "@ember-data-types/graph/unstable-preview-types",
        "@ember-data-types/json-api/unstable-preview-types",
        "@ember-data-types/legacy-compat/unstable-preview-types",
        "@ember-data-types/request/unstable-preview-types",
        "@ember-data-types/request-utils/unstable-preview-types",
        "@ember-data-types/model/unstable-preview-types",
        "@ember-data-types/serializer/unstable-preview-types",
        "@warp-drive-types/core-types/unstable-preview-types"
      ]
    }
 }
```

### Step 4 - brand your models

```ts
import Model from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbol';

export default class User extends Model {
  declare [Type]: 'user';
}
```

### Step 5 - replace registry usage with branded model usages

```ts
store.findRecord('user', '1');
store.findRecord<User>('user', '1');
```

### Step 6 - fix other type issues that arise

ArrayLike API usage is likely to give you the most issues here, if anything does.

## Migration

### Step 1 - Install the Mirror Packages

::: code-group

```sh [pnpm]
pnpm add -E @warp-drive-mirror/core@canary @warp-drive-mirror/json-api@canary @warp-drive-mirror/ember@canary @warp-drive-mirror/legacy@canary @warp-drive-mirror/utilities@canary
```

```sh [npm]
npm add -E @warp-drive-mirror/core@canary @warp-drive-mirror/json-api@canary @warp-drive-mirror/ember@canary @warp-drive-mirror/legacy@canary @warp-drive-mirror/utilities@canary
```

```sh [yarn]
yarn add -E @warp-drive-mirror/core@canary @warp-drive-mirror/json-api@canary @warp-drive-mirror/ember@canary @warp-drive-mirror/legacy@canary @warp-drive-mirror/utilities@canary
```

```sh [bun]
bun add --exact @warp-drive-mirror/core@canary @warp-drive-mirror/json-api@canary @warp-drive-mirror/ember@canary @warp-drive-mirror/legacy@canary @warp-drive-mirror/utilities@canary
```

:::

### Step 2 - Configure The Build


::: tabs key:paradigm

== Vite Minimal Config

```ts [babel.config.mjs]
import { setConfig } from '@warp-drive-mirror/core/build-config';
import { buildMacros } from '@embroider/macros/babel';

const Macros = buildMacros({
  configure: (config) => {
    setConfig(config, {
      // for universal apps this MUST be at least 5.6
      compatWith: '5.6'
    });
  },
});

export default {
  plugins: [
    ...Macros.babelMacros,
  ],
};
```

== Classic Config

```ts [ember-cli-build.js]
'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive-mirror/core/build-config'); // [!code focus]
  const { buildOnce } = await import('@embroider/vite');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, { // [!code focus:9]
    // this should be the most recent <major>.<minor> version for
    // which all deprecations have been fully resolved
    // and should be updated when that changes
    compatWith: '4.12',
    deprecations: {
      // ... list individual deprecations that have been resolved here
    }
  });

  return compatBuild(app, buildOnce);
};
```

:::

### Step 3 - Configure Reactivity

```ts [app/app.ts]
import '@warp-drive-mirror/ember/install';
```

### Step 4 - Configure the Store

:::tabs

== Coming from 4.12

```ts [app/services/v2-store.ts]
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  modelFragments: true,
  cache: JSONAPICache,
  schemas: [
     // -- your schemas here
  ],
});
```

== Coming from ModelFragments + 4.6

```ts [app/services/v2-store.ts]
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

export default useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  modelFragments: true,
  cache: JSONAPICache,
  schemas: [
     // -- your schemas here
  ],
});
```

:::

### Step 5 - Convert + Profit

Key concepts:

- [LegacyResourceSchema](/api/@warp-drive/core/types/schema/fields/interfaces/LegacyResourceSchema)
- [LegacyModeFieldSchema](/api/@warp-drive/core/types/schema/fields/type-aliases/LegacyModeFieldSchema)
- [registerTrait](/api/@warp-drive/core/types/schema/schema-service/interfaces/SchemaService#registertrait)
- [LegacyTrait](/api/@warp-drive/core/types/schema/fields/interfaces/LegacyTrait)
- [CAUTION_MEGA_DANGER_ZONE_registerExtension()](/api/@warp-drive/core/types/schema/schema-service/interfaces/SchemaService#caution-mega-danger-zone-registerextension)
- [CAUTION_MEGA_DANGER_ZONE_Extension](/api/@warp-drive/core/reactive/interfaces/CAUTION_MEGA_DANGER_ZONE_Extension)

#### A Basic Model

We migrate models with ResourceSchemas and extensions.

:::tabs

== Before

```ts [app/models/user.ts]
import Model, { attr, belongsTo, hasMany, type AsyncHasMany } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbol';
import { cached } from '@glimmer/tracking';
import { computed } from '@ember/object';

export default class User extends Model {
  declare [Type]: 'user';

  @attr firstName;
  @attr lastName;

  @belongsTo('user', { async: false, inverse: null })
  declare bestFriend: User | null;

  @hasMany('user', { async: true, inverse: null })
  declare friends: AsyncHasMany<User>;

  @cached
  get fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  @computed('firstName')
  get greeting() {
    return 'Hello ' + this.firstName + '!';
  }

  sayHi() {
    alert(this.greeting);
  }
}
```

== After

:::code-group

```ts [app/data/user/schema.ts]
import { withDefaults } from '@warp-drive-mirror/legacy/model/migration-support';
export const UserSchema {
  type: 'user';
  identity: { kind: '@id', name: 'id' },
  fields: [
    { kind: 'attribute', name: 'firstName' },
    { kind: 'attribute', name: 'lastName' },
    { 
      kind: 'belongsTo',
      name: 'bestFriend',
      type: 'user',
      options: { async: false, inverse: null }
    },
    {
      kind: 'hasMany',
      name: 'friends',
      type: 'user',
      options: { async: true, inverse: null }
    },
  ]
}
```

```ts [app/data/user/type.ts]
import { WithLegacy } from '@warp-drive-mirror/legacy/model/migration-support';
import { type AsyncHasMany } from '@warp-drive-mirror/legacy/model';
import type { Type } from '@warp-drive-mirror/core/types/symbol';

export type User = WithLegacy<{
  [Type]: 'user';
  firstName: string;
  lastName: string;
  user: User | null;
  friends: AsyncHasMany<User>;
}>;
```

```ts [app/data/user/ext.ts]
import { cached } from '@glimmer/tracking';
import { computed } from '@ember/object';
import { User } from './type.ts';

export class UserExtension {
  @cached
  get fullName(this: User) {
    return this.firstName + ' ' + this.lastName;
  }

  @computed('firstName')
  get greeting(this: User) {
    return 'Hello ' + this.firstName + '!';
  }

  sayHi() {
    alert(this.greeting);
  }
}
```

:::

#### A Model with Mixins

We can migrate mixins with traits and extensions.

:::tabs

== Before

:::code-group

```ts [app/models/user.ts]
import Model, { attr } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbol';
import Timestamped from '../mixins/timestamped';

export default class User extends Model.extend(Timestamped) {
  declare [Type]: 'user';

  @attr firstName;
  @attr lastName;
}
```

```ts [app/mixins/timestamped.ts]
import Mixin from '@ember/object/mixin';

export default Mixin.create({
  createdAt: attr(),
  deletedAt: attr(),
  updatedAt: attr(),

  async softDelete() {
    const result = await fetch(`/api/${this.constructor.modelName}/${this.id}`, { method: 'DELETE' });
    const newTimestamps = await result.json();
    this.store.push({
      data: {
        type: this.constructor.modelName,
        id: this.id,
        attributes: newTimestamps
      }
    });
  }
});
```

== After

:::code-group

```ts [app/data/user/schema.ts]
TBD
```

```ts [app/data/user/type.ts]
TBD
```

```ts [app/data/user/ext.ts]
TBD
```

:::

#### A Model with Fragments

:::tabs

== Before

```ts
TBD
```

== After

:::code-group

```ts [app/data/user/schema.ts]
TBD
```

```ts [app/data/user/type.ts]
TBD
```

```ts [app/data/user/ext.ts]
TBD
```

:::

## Post Migration

- drop the old packages
- drop config for the old packages
- delete the store service
- rename v2-store => store
- rename `@warp-drive-mirror` => `@warp-drive`
