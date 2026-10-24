---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/guides/the-manual/schemas/dsl/resource.md
description: >-
  Define a resource schema as a class with `@Resource`, `@field`, and `@id`,
  wire the `@warp-drive/schema-dsl` Vite plugin, and register the compiled
  output with the store (draft).
---

# Defining Resources

Use `@Resource` to define a resource schema and `@field` to define its fields.
Put each schema in its own file under a schemas directory.

```ts
// app/schemas/user.ts
import { Resource, field } from '@warp-drive/schema-dsl';

@Resource
class User {
  @field declare firstName: string;
  @field declare lastName: string;
  @field declare email: string;
}
```

At build time, the Vite plugin reads these files and produces the
equivalent of calling `withDefaults` by hand — you just write the class.

## Setup

Add the plugin to your Vite config, pointing it at your schema files:

```ts
// vite.config.ts
import { schemaDSL } from '@warp-drive/schema-dsl/vite';

export default defineConfig({
  plugins: [
    schemaDSL({
      schemas: 'app/schemas/**/*.ts',
    }),
  ],
});
```

Then import and register the compiled output:

```ts
import schemas from 'virtual:warp-drive-schemas';

registerDerivations(store.schema);
store.schema.registerResources(schemas);
```

## Type Name

The resource type is derived from the class name:

* `User` → `'user'`
* `UserProfile` → `'user-profile'`

Override with a string argument:

```ts
@Resource('person')
class User {
  @field declare name: string;
}
```

## Field Options

```ts
@field({ type: 'date-time' })
declare createdAt: Date;

@field({ sourceKey: 'email_address' })
declare email: string;
```

## Custom Identity

Use `@id` when your identity field isn't `id`:

```ts
import { Resource, field, id } from '@warp-drive/schema-dsl';

@Resource
class User {
  @id declare uuid: string;
  @field declare name: string;
}
```

## Legacy Mode

For apps using `@warp-drive/legacy/model`:

```ts
@Resource({ legacy: true })
class Post {
  @field declare title: string;
}
```
