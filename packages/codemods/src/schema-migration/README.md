# Schema Migration Codemod

This codemod helps migrate EmberData models and mixins to WarpDrive's schema-based architecture. It transforms traditional EmberData models into separate schema, extension, and type files that work with WarpDrive's new data layer.

## What it does

The schema-migration codemod analyzes your EmberData models and mixins and generates:

1. **Schema files** (`.schema.ts`): Define the data structure using `LegacyResourceSchema`
2. **Extension files** (`.extension.ts`): Preserve computed properties, methods, and other non-data logic
3. **Type files** (`.schema.types.ts`): TypeScript interfaces for type safety
4. **Trait files** (for mixins): Reusable schema components

## Architecture

### Core Components

- **`migrate-to-schema-index.ts`**: Main entry point that orchestrates the migration process
- **`model-to-schema.ts`**: Transforms EmberData models to WarpDrive schemas
- **`mixin-to-schema.ts`**: Transforms EmberData mixins to WarpDrive traits
- **`utils/ast-utils.ts`**: AST parsing and code generation utilities

### Key Features

- **Preserves original code structure**: Non-data logic is moved to extension files
- **Handles relationships**: Converts `@belongsTo` and `@hasMany` decorators
- **Supports mixins**: Converts mixins to reusable traits
- **Type-safe**: Generates TypeScript interfaces for all artifacts
- **Configurable**: Extensive configuration options for complex projects

## Usage

### Available Commands

The schema-migration codemod provides three commands:

1. **`migrate-to-schema`**: Batch migration for both models and mixins
2. **`model-to-schema`**: Transform specific model files
3. **`mixin-to-schema`**: Transform specific mixin files

### Basic Usage

```bash
# Batch migrate all models and mixins
npx @ember-data/codemods apply migrate-to-schema ./app

# Transform only models in batch
npx @ember-data/codemods apply migrate-to-schema --models-only ./app

# Transform only mixins in batch
npx @ember-data/codemods apply migrate-to-schema --mixins-only ./app

# Transform specific model files
npx @ember-data/codemods apply model-to-schema './app/models/**/*.{js,ts}'

# Transform specific mixin files
npx @ember-data/codemods apply mixin-to-schema './app/mixins/**/*.{js,ts}'

# With custom output directory
npx @ember-data/codemods apply migrate-to-schema \
  --output-dir './app/data/schemas' \
  ./app
```

### Configuration File

Create a `schema-migration.config.json` file for complex projects:

```json
{
  "$schema": "./node_modules/@ember-data/codemods/src/schema-migration/config-schema.json",
  "modelImportSource": "my-app/models",
  "resourcesImport": "my-app/data/resources",
  "outputDir": "./app/data/schemas",
  "modelSourceDir": "./app/models",
  "mixinSourceDir": "./app/mixins",
  "typeMapping": {
    "uuid": "string",
    "currency": "number",
    "json": "Record<string, unknown>"
  },
  "intermediateModelPaths": [
    "my-app/core/base-model"
  ]
}
```

Then run:
```bash
npx @ember-data/codemods apply migrate-to-schema --config ./schema-migration.config.json ./app
```

## Configuration Options

| Option | Description | Default | Commands |
|--------|-------------|---------|----------|
| `config` | Path to configuration file | None | All |
| `models-only` | Only process model files | `false` | `migrate-to-schema` |
| `mixins-only` | Only process mixin files | `false` | `migrate-to-schema` |
| `skip-processed` | Skip files that have already been processed | `false` | `migrate-to-schema` |
| `model-source-dir` | Directory containing model files | `./app/models` | `migrate-to-schema` |
| `mixin-source-dir` | Directory containing mixin files | `./app/mixins` | `migrate-to-schema` |
| `output-dir` | Output directory for generated files | `./app/schemas` | `migrate-to-schema` |
| `input-dir` | Input directory containing files | `./app/models` | `model-to-schema` |
| `output-dir` | Output directory for schemas | `./app/schemas` | `model-to-schema` |
| `input-dir` | Input directory containing files | `./app/mixins` | `mixin-to-schema` |
| `output-dir` | Output directory for traits | `./app/traits` | `mixin-to-schema` |
| `dry` | Show changes without applying them | `false` | All |
| `verbose` | Show detailed output (0-2) | `0` | All |
| `log-file` | Write logs to a file | None | All |
| `ignore` | Ignore file or glob patterns | None | All |

### Configuration File Options

The JSON configuration file supports additional options not available via CLI:

| Option | Description | Default |
|--------|-------------|---------|
| `modelImportSource` | Base import path for existing model imports | Required |
| `resourcesImport` | Base import path for new resource type imports | Required |
| `traitsDir` | Directory to write trait schemas | `./app/traits` |
| `extensionsDir` | Directory to write extensions | `./app/extensions` |
| `resourcesDir` | Directory to write schemas | `./app/schemas` |
| `typeMapping` | Custom transform type mappings | `{}` |
| `intermediateModelPaths` | Intermediate model classes to convert to traits | `[]` |
| `emberDataImportSource` | Alternate import source for EmberData decorators | `@ember-data/model` |
| `mirror` | Use @warp-drive-mirror instead of @warp-drive | `false` |
| `additionalModelSources` | Additional model source patterns | `[]` |
| `additionalMixinSources` | Additional mixin source patterns | `[]` |
| `runPostTransformLinting` | Run ESLint after transformation | `true` |
| `runPostTransformPrettier` | Run Prettier after transformation | `true` |

## Examples

### Simple Model

**Input:**
```ts
import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') declare name: string;
  @attr('string') declare email: string;

  get displayName() {
    return this.name || this.email;
  }
}
```

**Generated Schema (`user.schema.ts`):**
```ts
export const UserSchema = {
  type: 'user',
  fields: {
    name: { kind: 'attribute', type: 'string' },
    email: { kind: 'attribute', type: 'string' }
  }
};
```

**Generated Extension (`user.extension.ts`):**
```ts
export class UserExtension {
  get displayName() {
    return this.name || this.email;
  }
}
```

**Generated Types (`user.schema.types.ts`):**
```ts
export interface User {
  [Type]: 'user';
  name: string;
  email: string;
}
```

### Model with Relationships

**Input:**
```ts
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class Post extends Model {
  @attr('string') declare title: string;
  @belongsTo('user', { async: false }) declare author: User;
  @hasMany('comment', { async: true, inverse: 'post' }) declare comments: Comment[];
}
```

**Generated Schema:**
```ts
export const PostSchema = {
  type: 'post',
  fields: {
    title: { kind: 'attribute', type: 'string' },
    author: { kind: 'belongsTo', type: 'user', options: { async: false } },
    comments: { kind: 'hasMany', type: 'comment', options: { async: true, inverse: 'post' } }
  }
};
```

### Mixin to Trait

**Input Mixin:**
```ts
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  @attr('date') createdAt: null,
  @attr('date') updatedAt: null,

  get isRecent() {
    return Date.now() - this.createdAt < 86400000; // 24 hours
  }
});
```

**Generated Trait Schema (`timestampable.schema.ts`):**
```ts
export const TimestampableTrait = {
  fields: {
    createdAt: { kind: 'attribute', type: 'date' },
    updatedAt: { kind: 'attribute', type: 'date' }
  }
};
```

**Generated Trait Extension (`timestampable.extension.ts`):**
```ts
export class TimestampableExtension {
  get isRecent() {
    return Date.now() - this.createdAt < 86400000; // 24 hours
  }
}
```

## Advanced Features

### Intermediate Models

If you have base model classes that multiple models extend, you can configure them as intermediate models:

```json
{
  "intermediateModelPaths": [
    "my-app/core/base-model",
    "my-app/core/auditable-model"
  ]
}
```

These will be converted to traits that other models can include.

### Custom Type Mappings

Map custom EmberData transform types to TypeScript types:

```json
{
  "typeMapping": {
    "uuid": "string",
    "currency": "number",
    "json": "Record<string, unknown>",
    "encrypted": "string"
  }
}
```

### Directory Structure

The codemod can organize generated files into custom directory structures using the configuration file:

```json
{
  "traitsDir": "./app/data/traits",
  "extensionsDir": "./app/data/extensions",
  "resourcesDir": "./app/data/schemas"
}
```

**Note**: The CLI commands use simpler `--output-dir` options, while the configuration file provides fine-grained control over where different types of artifacts are written.

## Testing

The codemod includes comprehensive tests in `packages/codemods/test/schema-migration/`:

- **Unit tests**: Test individual transform functions
- **Integration tests**: Test full file transformations
- **Fixture tests**: Test against real-world examples
- **Snapshot tests**: Ensure consistent output

Run tests with:
```bash
cd packages/codemods
npm test
```

## Limitations

- **GJS/GTS files**: Not currently supported
- **Complex inheritance**: Deep inheritance hierarchies may need manual adjustment
- **Dynamic properties**: Runtime-computed properties may not be detected
- **Circular dependencies**: May require manual resolution

## Contributing

This codemod is part of the EmberData project. See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Development

1. **Edit transforms**: Modify files in `src/schema-migration/`
2. **Add tests**: Update tests in `test/schema-migration/`
3. **Update docs**: Keep this README in sync with changes
4. **Test thoroughly**: Run the full test suite before submitting

### Architecture Notes

The codemod uses [ast-grep](https://ast-grep.github.io/) for AST parsing and manipulation, which provides reliable parsing for both JavaScript and TypeScript. The core transformation logic is split into:

- **AST utilities**: Low-level AST parsing and manipulation
- **Transform functions**: High-level transformation logic
- **Code generation**: Template-based code generation
- **CLI interface**: Command-line argument processing

This separation makes the codemod maintainable and testable.
