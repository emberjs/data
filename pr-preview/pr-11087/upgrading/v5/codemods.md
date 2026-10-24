---
url: /pr-preview/pr-11087/upgrading/v5/codemods.md
---

# Using Codemods

WarpDrive provides automated codemods to help migrate your EmberData application to modern WarpDrive patterns. The `@ember-data/codemods` package includes tools for transforming models and mixins into schemas, updating legacy store methods, and managing package dependencies.

> \[!NOTE]
> The codemods are under active development. Missing features and bugs are expected - please report any issues you find!

## Getting Started

> \[!NOTE]
> The codemods require Node.js `>= 22.2` and run on macOS, Linux (glibc and musl/Alpine),
> and Windows, on both x64 and arm64. `pnpm dlx` and `bunx` work as well as `npx`.

### Listing Available Codemods

```bash
npx @ember-data/codemods list
```

This will print the available codemods:

| Codemod | Description |
|---|---|
| `migrate-to-schema` | Migrates EmberData models and mixins to WarpDrive schemas |
| `legacy-compat-builders` | Updates legacy store methods to use `store.request` and builders |

### Running a Codemod

```bash
npx @ember-data/codemods apply <codemod-name> [options] <target...>
```

To see the options for a specific codemod:

```bash
npx @ember-data/codemods apply <codemod-name> --help
```

## migrate-to-schema

This codemod transforms EmberData models and mixins into WarpDrive's schema format. For each model it generates:

* **Schema files** - Define the data structure using `LegacyResourceSchema`
* **Type files** - TypeScript interfaces for the resource
* **Extension files** - Preserve computed properties, methods, and other non-data logic
* **Trait files** - Reusable schema components extracted from mixins

The codemod is **non-destructive** - original model files are not removed. New files are generated in the `app/data/` by default.

### Basic Usage

```bash
# Transform all models and mixins (looks at ./app by default)
npx @ember-data/codemods apply migrate-to-schema --project-name my-app

# With custom search path
npx @ember-data/codemods apply migrate-to-schema --project-name my-app ./packages/ember-app/app

# Specify the WarpDrive import preset
npx @ember-data/codemods apply migrate-to-schema --project-name my-app --warp-drive-imports legacy
```

| Option | Description |
|---|---|
| `--project-name <name>` | Project name for resolving classic ember module imports (e.g., `my-app/models/user`) |
| `--warp-drive-imports <preset>` | WarpDrive import preset: `legacy` (default, `@ember-data/*`), `modern` (`@warp-drive/*`), or `mirror` (`@warp-drive-mirror/*`) |
| `--config <path>` | Path to a JSON configuration file |
| `--skip-processed` | Skip files that have already been processed |
| `--force-typescript` | Force all output files to TypeScript (`.ts`) |
| `--model-source-dir <path>` | Directory containing model files (default: `./app/models`) |
| `--mixin-source-dir <path>` | Directory containing mixin files (default: `./app/mixins`) |
| `--output-dir <path>` | Output directory for generated schemas (default: `./app/data`) |

### Configuration

When the defaults aren't enough: For projects with custom base classes, re-exported models, or monorepo structures, the codemod accepts a JSON configuration file:

```bash
npx @ember-data/codemods apply migrate-to-schema --config=./codemod.config.json
```

> \[!TIP]
> For the full list of available configuration options, see the [config type definition](https://github.com/warp-drive-data/warp-drive/blob/main/packages/codemods/src/schema-migration/config.ts) and the [JSON schema](https://github.com/warp-drive-data/warp-drive/blob/main/packages/codemods/src/schema-migration/config-schema.json).

#### Simple Configuration

For most projects, a minimal config is all you need. The `warpDriveImports` option tells the codemod which package set your app uses for WarpDrive APIs - `"legacy"` for classic `@ember-data/*` packages, `"modern"` for the new `@warp-drive/*` packages:

```json
{
  "projectName": "example-app",
  "warpDriveImports": "legacy",
  "typeMapping": {
    "uuid": "string",
    "currency": "number",
    "json": "unknown"
  }
}
```

#### Complex Configuration

For projects with custom import sources, intermediate base classes, or monorepo structures where models and mixins live across multiple packages:

```json
{
  "projectName": "example-app",
  "emberDataImportSource": "@example-org/warp-drive/v1/model",
  "resourcesImport": "example-app/data/resources",
  "forceTypeScript": true,
  "typeMapping": {
    "uuid": "string",
    "currency": "number",
    "json": "unknown"
  },
  "warpDriveImports": {
    "Model": { "imported": "default", "source": "@example-org/warp-drive/v1/model" },
    "Type": { "imported": "Type", "source": "@example-org/warp-drive/v1/core-types/symbols" },
    "WithLegacy": { "imported": "WithLegacy", "source": "@example-org/warp-drive/v1/model/migration-support" },
    "withDefaults": { "imported": "withDefaults", "source": "@example-org/warp-drive/v1/model/migration-support" },
    "LegacyResourceSchema": { "imported": "LegacyResourceSchema", "source": "@example-org/warp-drive/v1/core-types/schema/fields" }
  },
  "intermediateModelPaths": [
    "example-app/core/data-field-model",
    "@example-org/client-core/mixins/base-model",
    "../core/base-model"
  ],
  "additionalMixinSources": [
    {
      "pattern": "@example-org/core/mixins/*",
      "dir": "../../libraries/core/package/src/mixins/*"
    }
  ],
  "additionalModelSources": [
    {
      "pattern": "example-app/core/",
      "dir": "./app/core/"
    },
    {
      "pattern": "../core/",
      "dir": "./app/core/"
    }
  ]
}
```

Key configuration options:

* **`projectName`** - The Ember app name, used for resolving classic module imports like `example-app/models/user`.
* **`emberDataImportSource`** / **`warpDriveImports`** - Tell the codemod where your app imports EmberData and WarpDrive APIs from, when they differ from the defaults (`@ember-data/model`, `@warp-drive/core`, etc.).
* **`typeMapping`** - Maps custom EmberData transform names (e.g., `@attr('uuid')`) to TypeScript types for the generated type files.
* **`intermediateModelPaths`** - Import paths of base classes between `Model` and your concrete models. The codemod will analyze these and convert them to traits.
* **`importSubstitutes`** - For base classes whose source can't be analyzed, tells the codemod what trait/extension names to reference.
* **`additionalModelSources`** / **`additionalMixinSources`** - Maps import patterns to on-disk directories so the codemod can locate source files that live outside the main `app/` directory (e.g., in a monorepo's shared libraries).

### What Gets Generated

Given a model like:

```ts
// app/models/user.ts
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  declare [Type]: 'user';

  @attr('string') declare name: string;
  @attr('string') declare email: string;

  @belongsTo('company', { async: false, inverse: null })
  declare company: Company;

  @hasMany('post', { async: true, inverse: 'author' })
  declare posts: Post[];

  get displayName() {
    return this.name || this.email;
  }
}
```

The codemod produces:

::: code-group

```ts [app/data/resources/user/schema.ts]
import { withDefaults } from '@warp-drive/legacy/model/migration-support';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { kind: 'attribute', name: 'name', type: 'string' },
    { kind: 'attribute', name: 'email', type: 'string' },
    {
      kind: 'belongsTo',
      name: 'company',
      type: 'company',
      options: { async: false, inverse: null },
    },
    {
      kind: 'hasMany',
      name: 'posts',
      type: 'post',
      options: { async: true, inverse: 'author' },
    },
  ],
  objectExtensions: ['user-extension'],
});
```

```ts [app/data/resources/user/type.ts]
import type { Type } from '@warp-drive/core/types/symbols';
import { WithLegacy } from '@warp-drive/legacy/model/migration-support';

export interface User {
  [Type]: 'user';
  name: string;
  email: string;
  company: Company;
  posts: Post[];
}

export type LegacyUser = WithLegacy<User>;
```

```ts [app/data/resources/user/ext.ts]
import type { LegacyUser } from './type';

export interface UserExtension extends LegacyUser {}
export class UserExtension {
  get displayName() {
    return this.name || this.email;
  }
}

const Registration = {
  name: 'user-extension',
  kind: 'object',
  features: UserExtension,
};
export default Registration;
```

:::

### Mixins Become Traits

Mixins are decomposed into trait schemas and extensions:

::: tabs

\== Before

```ts
// app/mixins/timestamped.ts
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  createdAt: attr(),
  updatedAt: attr(),

  async softDelete() {
    // ...
  }
});
```

\== After

::: code-group

```ts [app/data/traits/timestamped/schema.ts]
export const TimestampedTrait = {
  name: 'timestamped',
  mode: 'legacy',
  fields: [
    { kind: 'attribute', name: 'createdAt' },
    { kind: 'attribute', name: 'updatedAt' },
  ],
};
```

```ts [app/data/traits/timestamped/type.ts]
export interface Timestamped {
  createdAt: unknown;
  updatedAt: unknown;
}
```

```ts [app/data/traits/timestamped/ext.ts]
import type { Timestamped } from './type';

export interface TimestampedExtension extends Timestamped {}
export class TimestampedExtension {
  async softDelete() {
    // ...
  }
}

const Registration = {
  kind: 'object',
  name: 'timestamped-extension',
  features: TimestampedExtension,
};
export default Registration;
```

:::

Models that use the mixin will reference the trait and extension by name in their generated schemas:

```ts
export const UserSchema = withDefaults({
  type: 'user',
  fields: [/* ... */],
  traits: ['timestamped'],
  objectExtensions: ['timestamped-extension', 'user-extension'],
});
```

### Caveats

* **Parent / base classes require manual migration.** The codemod does not reliably migrate abstract base classes such as `BaseModel` or `DataFieldModel`. If your app has intermediate classes between `Model` and your concrete models, you should migrate those by hand first and then use `importSubstitutes` or `intermediateModelPaths` in your [configuration](#configuration) to tell the codemod how to reference them.

* **Re-exported models from libraries are not migrated.** The codemod tries its best to follow imports and locate source files, but models that are re-exported from external packages (e.g., `import MyModel from '@my-org/shared-models/my-model'`) cannot have their source analyzed. These will be skipped. Use `additionalModelSources` to point the codemod at the on-disk location of library code, or migrate those models manually.

* **Only the default export is processed per file.** If a file contains multiple classes, only the default export (or `export { X as default }`) is analyzed. Additional class declarations in the same file are silently ignored. Split them into separate files before running the codemod.

* Run the codemod, review the output, and iterate on configuration as needed. Most projects will need at least a minimal config file.

### Registering Generated Schemas

After the codemod generates your schema, type, and extension files, you need to register them with the WarpDrive store. You can use `import.meta.glob` (available in Vite and Embroider) to bulk-load everything from the generated directories instead of manually importing each file.

#### Loading schemas, traits, and extensions

```ts
const schemaModules = import.meta.glob('./data/resources/**/*.schema.ts', { eager: true });
const traitModules = import.meta.glob('./data/traits/**/*.schema.ts', { eager: true });
const extensionModules = import.meta.glob(
  ['./data/resources/**/*.ext.ts', './data/traits/**/*.ext.ts'],
  { eager: true }
);
```

Each module's default or named export contains the schema/trait/extension object that needs to be registered.

#### Registering with `useLegacyStore`

`useLegacyStore` accepts `schemas`, `traits`, and `CAUTION_MEGA_DANGER_ZONE_extensions` arrays directly:

```ts
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

const schemas = Object.values(import.meta.glob('../data/resources/**/*.schema.ts', { eager: true, import: 'default' }));
const traits = Object.values(import.meta.glob('../data/traits/**/*.schema.ts', { eager: true, import: 'default' }));
const extensions = Object.values(import.meta.glob(
  ['../data/resources/**/*.ext.ts', '../data/traits/**/*.ext.ts'],
  { eager: true, import: 'default' }
));

export default useLegacyStore({
  legacyRequests: true,
  cache: JSONAPICache,
  schemas,
  traits,
  CAUTION_MEGA_DANGER_ZONE_extensions: extensions,
});
```

#### Registering with a custom store

If you are using a custom `Store` subclass with `createSchemaService()`, register manually on the `SchemaService`:

```ts
createSchemaService() {
  const schema = new SchemaService();
  registerDerivations(schema);

  schema.registerResources(schemas);

  for (const trait of traits) {
    schema.registerTrait(trait);
  }

  for (const extension of extensions) {
    schema.CAUTION_MEGA_DANGER_ZONE_registerExtension(extension);
  }

  return schema;
}
```

## legacy-compat-builders

This codemod updates legacy store methods (`findAll`, `findRecord`, `query`, `queryRecord`, `saveRecord`) to use `store.request` with builders from `@ember-data/legacy-compat/builders`.

### Usage

```bash
# Transform all files matching the pattern
npx @ember-data/codemods apply legacy-compat-builders './app/**/*.{js,ts}'

# Transform only specific methods
npx @ember-data/codemods apply legacy-compat-builders --methods findRecord query './app/**/*.{js,ts}'

# Dry run
npx @ember-data/codemods apply legacy-compat-builders --dry './app/**/*.{js,ts}'
```

### Options

| Option | Description |
|---|---|
| `-d, --dry` | Dry run (no changes made) |
| `-v, --verbose <level>` | Verbosity level (`0`, `1`, `2`) |
| `-l, --log-file [path]` | Write logs to a file |
| `-i, --ignore <pattern...>` | Ignore files matching the pattern |
| `--store-names <name...>` | Identifier names for the store (default: `["store"]`) |
| `--methods <name...>` | Only transform specific methods |

### Examples

#### findAll

```ts
// before
const posts = await store.findAll<Post>('post');

// after
import { findAll } from '@ember-data/legacy-compat/builders';
const { content: posts } = await store.request<Post[]>(findAll<Post>('post'));
```

#### findRecord

```ts
// before
const post = await store.findRecord<Post>({ type: 'post', id: '1' });

// after
import { findRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id: '1' }));
```

#### query

```ts
// before
const posts = await store.query<Post>('post', { id: '1' });

// after
import { query } from '@ember-data/legacy-compat/builders';
const { content: posts } = await store.request<Post[]>(query<Post>('post', { id: '1' }));
```

#### queryRecord

```ts
// before
const post = await store.queryRecord<Post>('post', { id: '1' });

// after
import { queryRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request<Post>(queryRecord<Post>('post', { id: '1' }));
```

#### saveRecord

```ts
// before
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const saved = await store.saveRecord<Post>(post);

// after
import { saveRecord } from '@ember-data/legacy-compat/builders';
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const { content: saved } = await store.request<Post>(saveRecord(post));
```

### Caveats

* Calls to legacy store methods that are **not awaited** will not be transformed. The codemod cannot safely add `await` since it doesn't know if consuming code can handle the change.
* **Exception**: In a route's `model` hook, the codemod will transform the call and add `await`.
* `store.findRecord` calls with a `preload` option are not transformed, as this option is not supported by the legacy compat builders.
* GJS and GTS files are not currently supported.

See the [V3/V4 to V5 migration guide](./index.md) for the full migration process including store setup, reactivity configuration, and post-migration cleanup.
