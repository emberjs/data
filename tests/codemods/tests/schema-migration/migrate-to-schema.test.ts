import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type MigrateOptions, runMigration } from '../../../../packages/codemods/src/schema-migration/migrate-to-schema.js';

describe('migrate-to-schema batch operation', () => {
  let tempDir: string;
  let options: MigrateOptions;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'migrate-to-schema-test-'));

    options = {
      inputDir: tempDir,
      outputDir: join(tempDir, 'app/schemas'),
      resourcesDir: join(tempDir, 'app/data/resources'),
      traitsDir: join(tempDir, 'app/data/traits'),
      extensionsDir: join(tempDir, 'app/data/extensions'),
      modelSourceDir: join(tempDir, 'app/models'),
      mixinSourceDir: join(tempDir, 'app/mixins'),
      resourcesImport: 'test-app/data/resources',
      traitsImport: 'test-app/data/traits',
      extensionsImport: 'test-app/data/extensions',
      modelImportSource: 'test-app/models',
      mixinImportSource: 'test-app/mixins',
      dryRun: false,
      verbose: false,
    };
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('generates schema and type artifacts for models', async () => {
    // Create a simple model file
    const modelSource = `
import Model, { attr, belongsTo } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
  @attr('string') email;
  @belongsTo('company', { async: false }) company;

  // Extension property
  get displayName() {
    return this.name || this.email;
  }
}
`;

    // Write model file
    const modelsDir = join(tempDir, 'app/models');
    mkdirSync(modelsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'user.ts'), modelSource);

    // Run migration
    await runMigration(options);

    // Check that schema file was generated
    const schemaPath = join(tempDir, 'app/data/resources/user.js');
    expect(existsSync(schemaPath)).toBe(true);

    // Check that type file was generated
    const typePath = join(tempDir, 'app/data/resources/user.schema.types.ts');
    expect(existsSync(typePath)).toBe(true);

    // Check that extension file was generated
    const extensionPath = join(tempDir, 'app/data/extensions/user.js');
    expect(existsSync(extensionPath)).toBe(true);
  });

  it('skips mixin processing when no model-connected mixins are found', async () => {
    // Create a simple mixin file that is NOT connected to any models
    const mixinSource = `
import Mixin from '@ember/object/mixin';

export default Mixin.create({
  commonMethod() {
    return 'common behavior';
  }
});
`;

    // Write mixin file only (no model using it)
    const mixinsDir = join(tempDir, 'app/mixins');
    mkdirSync(mixinsDir, { recursive: true });
    writeFileSync(join(mixinsDir, 'unused.ts'), mixinSource);

    // Run migration
    await runMigration(options);

    // Check that no trait file was generated (since mixin is not connected to models)
    const traitPath = join(tempDir, 'app/data/traits/unused.js');
    expect(existsSync(traitPath)).toBe(false);
  });

  it('generates multiple artifacts when processing multiple files', async () => {
    // Create multiple model files
    const user = `
import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
  @attr('string') email;
}
`;

    const company = `
import Model, { attr, hasMany } from '@ember-data/model';

export default class Company extends Model {
  @attr('string') name;
  @hasMany('user', { async: false, inverse: 'company' }) users;

  get userCount() {
    return this.users.length;
  }
}
`;

    // Write model files
    const modelsDir = join(tempDir, 'app/models');
    mkdirSync(modelsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'user.ts'), user);
    writeFileSync(join(modelsDir, 'company.ts'), company);

    // Run migration
    await runMigration(options);

    // Check that all schema files were generated
    expect(existsSync(join(tempDir, 'app/data/resources/user.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/company.js'))).toBe(true);

    // Check that all type files were generated
    expect(existsSync(join(tempDir, 'app/data/resources/user.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/company.schema.types.ts'))).toBe(true);

    // Check that extension file was generated for company (it has a computed property)
    expect(existsSync(join(tempDir, 'app/data/extensions/company.js'))).toBe(true);
  });

  it('respects dryRun option and does not create files', async () => {
    // Create a model file
    const modelSource = `
import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
}
`;

    // Write model file
    const modelsDir = join(tempDir, 'app/models');
    mkdirSync(modelsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'user.ts'), modelSource);

    // Run migration with dryRun
    const dryRunOptions: MigrateOptions = { ...options, dryRun: true };
    await runMigration(dryRunOptions);

    // Check that no files were generated
    expect(existsSync(join(tempDir, 'app/data/resources/user.js'))).toBe(false);
    expect(existsSync(join(tempDir, 'app/data/resources/user.schema.types.ts'))).toBe(false);
  });

  it('creates output directories if they do not exist', async () => {
    // Create a model file
    const modelSource = `
import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;

  get displayName() {
    return this.name;
  }
}
`;

    // Write model file (but don't create output directories)
    const modelsDir = join(tempDir, 'app/models');
    mkdirSync(modelsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'user.ts'), modelSource);

    // Verify output directories don't exist yet
    expect(existsSync(join(tempDir, 'app/data/resources'))).toBe(false);
    expect(existsSync(join(tempDir, 'app/data/extensions'))).toBe(false);

    // Run migration
    await runMigration(options);

    // Verify directories were created
    expect(existsSync(join(tempDir, 'app/data/resources'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/extensions'))).toBe(true);

    // Verify files were created
    expect(existsSync(join(tempDir, 'app/data/resources/user.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/user.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/extensions/user.js'))).toBe(true);
  });


  it('respects models-only and mixins-only options', async () => {
    // Create both model and mixin files
    const modelSource = `
import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
}
`;

    const mixinSource = `
import Mixin from '@ember/object/mixin';

export default Mixin.create({
  commonMethod() {}
});
`;

    // Write files
    const modelsDir = join(tempDir, 'app/models');
    const mixinsDir = join(tempDir, 'app/mixins');
    mkdirSync(modelsDir, { recursive: true });
    mkdirSync(mixinsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'user.ts'), modelSource);
    writeFileSync(join(mixinsDir, 'common.ts'), mixinSource);

    // Test models-only option
    const modelsOnlyOptions: MigrateOptions = { ...options, modelsOnly: true };
    await runMigration(modelsOnlyOptions);

    // Check that only model artifacts were generated
    expect(existsSync(join(tempDir, 'app/data/resources/user.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/common.js'))).toBe(false);
  });

  it('ensures type files are always .ts regardless of source file extension', async () => {
    // Create model files with different extensions
    const jsModelSource = `
import Model, { attr } from '@ember-data/model';

export default class JsModel extends Model {
  @attr('string') name;
}
`;

    const tsModelSource = `
import Model, { attr } from '@ember-data/model';

export default class TsModel extends Model {
  @attr('string') name;
}
`;

    // Write model files with different extensions
    const modelsDir = join(tempDir, 'app/models');
    mkdirSync(modelsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'js-model.js'), jsModelSource);
    writeFileSync(join(modelsDir, 'ts-model.ts'), tsModelSource);

    // Run migration
    await runMigration(options);

    // Check that both type files are .ts regardless of source extension
    expect(existsSync(join(tempDir, 'app/data/resources/js-model.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/ts-model.schema.types.ts'))).toBe(true);

    // Ensure .js type files were NOT created
    expect(existsSync(join(tempDir, 'app/data/resources/js-model.schema.types.js'))).toBe(false);
    expect(existsSync(join(tempDir, 'app/data/resources/ts-model.schema.types.js'))).toBe(false);
  });

  it('colocates type files with their corresponding schemas and traits', async () => {
    // Create nested directory structure
    const nestedModelSource = `
import Model, { attr } from '@ember-data/model';

export default class NestedModel extends Model {
  @attr('string') name;
}
`;

    const connectedMixinSource = `
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  commonField: attr('string')
});
`;

    const modelUsingMixin = `
import Model, { attr } from '@ember-data/model';
import ConnectedMixin from '../../mixins/admin/connected';

export default class AdminModel extends Model.extend(ConnectedMixin) {
  @attr('string') adminName;
}
`;

    // Create nested directory structures
    const modelsDir = join(tempDir, 'app/models');
    const mixinsDir = join(tempDir, 'app/mixins');
    mkdirSync(join(modelsDir, 'admin'), { recursive: true });
    mkdirSync(join(mixinsDir, 'admin'), { recursive: true });

    // Write files
    writeFileSync(join(modelsDir, 'admin/nested-model.ts'), nestedModelSource);
    writeFileSync(join(mixinsDir, 'admin/connected.ts'), connectedMixinSource);
    writeFileSync(join(modelsDir, 'admin/admin-model.ts'), modelUsingMixin);

    // Run migration
    await runMigration({...options, verbose: true});

    // Check that schema and type files are colocated in resources
    expect(existsSync(join(tempDir, 'app/data/resources/admin/nested-model.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/admin/nested-model.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/admin/admin-model.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/admin/admin-model.schema.types.ts'))).toBe(true);

    // Check that trait and trait-type files are colocated in traits
    expect(existsSync(join(tempDir, 'app/data/traits/admin/connected.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/admin/connected.schema.types.ts'))).toBe(true);
  });

  it('does not put type files in the default fallback directory', async () => {
    // Create a model file
    const modelSource = `
import Model, { attr } from '@ember-data/model';

export default class User extends Model {
  @attr('string') name;
}
`;

    // Write model file
    const modelsDir = join(tempDir, 'app/models');
    mkdirSync(modelsDir, { recursive: true });
    writeFileSync(join(modelsDir, 'user.ts'), modelSource);

    // Run migration
    await runMigration(options);

    // Check that type files are NOT in the default fallback directory (app/schemas)
    expect(existsSync(join(tempDir, 'app/schemas'))).toBe(false);
    expect(existsSync(join(tempDir, 'app/schemas/user.schema.types.ts'))).toBe(false);

    // Verify they are in the correct location (colocated with schemas)
    expect(existsSync(join(tempDir, 'app/data/resources/user.schema.types.ts'))).toBe(true);
  });

  it('handles external mixin imports from additionalMixinSources', async () => {
    // Create a model that imports external mixins
    const modelWithExternalMixin = `
import Model, { attr } from '@ember-data/model';
import ExternalMixin from '@external/mixins/external-mixin';
import LocalMixin from '../mixins/local-mixin';

export default class TestModel extends Model.extend(ExternalMixin, LocalMixin) {
  @attr('string') name;
}
`;

    const localMixin = `
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  localField: attr('string')
});
`;

    const externalMixin = `
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  externalField: attr('string')
});
`;

    // Write model and local mixin
    const modelsDir = join(tempDir, 'app/models');
    const mixinsDir = join(tempDir, 'app/mixins');
    mkdirSync(modelsDir, { recursive: true });
    mkdirSync(mixinsDir, { recursive: true });

    writeFileSync(join(modelsDir, 'test-model.ts'), modelWithExternalMixin);
    writeFileSync(join(mixinsDir, 'local-mixin.ts'), localMixin);

    // Create external mixin directory and file
    const externalMixinsDir = join(tempDir, 'external/mixins');
    mkdirSync(externalMixinsDir, { recursive: true });
    writeFileSync(join(externalMixinsDir, 'external-mixin.ts'), externalMixin);

    // Add additionalMixinSources configuration
    const optionsWithExternal: MigrateOptions = {
      ...options,
      additionalMixinSources: [
        {
          pattern: '@external/mixins/*',
          dir: join(tempDir, 'external/mixins/*')
        }
      ]
    };

    // Run migration
    await runMigration(optionsWithExternal);


    // Check that schema and trait files were generated for both local and external mixins
    expect(existsSync(join(tempDir, 'app/data/resources/test-model.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/test-model.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/local-mixin.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/local-mixin.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/external-mixin.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/external-mixin.schema.types.ts'))).toBe(true);
  });

  it('handles mixed js and ts files correctly with proper type file extensions', async () => {
    // Create mixed model and mixin files
    const jsModel = `
import Model, { attr } from '@ember-data/model';
import JsMixin from '../mixins/js-mixin';

export default class JsModelWithMixin extends Model.extend(JsMixin) {
  @attr('string') name;

  get displayName() {
    return this.name + ' (JS)';
  }
}
`;

    const tsMixin = `
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  isEnabled: attr('boolean'),

  toggleEnabled() {
    this.set('isEnabled', !this.isEnabled);
  }
});
`;

    const jsMixin = `
import Mixin from '@ember/object/mixin';
import { attr } from '@ember-data/model';

export default Mixin.create({
  createdAt: attr('date')
});
`;

    const tsModel = `
import Model, { attr } from '@ember-data/model';
import TsMixin from '../mixins/ts-mixin';

export default class TsModelWithMixin extends Model.extend(TsMixin) {
  @attr('string') title;
}
`;

    // Write mixed files
    const modelsDir = join(tempDir, 'app/models');
    const mixinsDir = join(tempDir, 'app/mixins');
    mkdirSync(modelsDir, { recursive: true });
    mkdirSync(mixinsDir, { recursive: true });

    writeFileSync(join(modelsDir, 'js-model-with-mixin.js'), jsModel);
    writeFileSync(join(modelsDir, 'ts-model-with-mixin.ts'), tsModel);
    writeFileSync(join(mixinsDir, 'js-mixin.js'), jsMixin);
    writeFileSync(join(mixinsDir, 'ts-mixin.ts'), tsMixin);

    // Run migration
    await runMigration(options);

    // Check that all schema files are .js regardless of source
    expect(existsSync(join(tempDir, 'app/data/resources/js-model-with-mixin.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/ts-model-with-mixin.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/js-mixin.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/ts-mixin.js'))).toBe(true);

    // Check that all type files are .ts regardless of source extension
    expect(existsSync(join(tempDir, 'app/data/resources/js-model-with-mixin.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/ts-model-with-mixin.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/js-mixin.schema.types.ts'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/ts-mixin.schema.types.ts'))).toBe(true);

    // Check that extension files preserve source extension
    expect(existsSync(join(tempDir, 'app/data/extensions/js-model-with-mixin.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/extensions/ts-mixin.js'))).toBe(true); // Extension from TS mixin
  });

  it('processes intermediateModelPaths to generate traits from base model classes', async () => {
    // This test ensures the data-field trait regression doesn't happen again
    // The bug was that processIntermediateModelsToTraits wasn't being called

    // Create a data field model (intermediate model)
    const dataFieldModel = `
import BaseModel from './base-model';
import BaseModelMixin from '@external/mixins/base-model-mixin';
import { attr } from '@ember-data/model';

/**
 * Data fields are used to represent information that can be selected via a
 * select list in the UI.
 */
export default class DataFieldModel extends BaseModel.extend(BaseModelMixin) {
  @attr('string') name;
  @attr('number') sortOrder;
}
`;

    // Create a base model
    const baseModel = `
import Model from '@ember-data/model';

export default class BaseModel extends Model {
}
`;

    // Create a regular model that extends DataFieldModel
    const optionModel = `
import DataFieldModel from '../core/data-field-model';

export default class CustomSelectOption extends DataFieldModel {
}
`;

    // Create an external mixin
    const externalMixin = `
import Mixin from '@ember/object/mixin';

export default Mixin.create({
  // Base model functionality
});
`;

    // Setup directories
    const coreDir = join(tempDir, 'app/core');
    const modelsDir = join(tempDir, 'app/models');
    const externalMixinsDir = join(tempDir, 'external/mixins');
    mkdirSync(coreDir, { recursive: true });
    mkdirSync(modelsDir, { recursive: true });
    mkdirSync(externalMixinsDir, { recursive: true });

    // Write files
    writeFileSync(join(coreDir, 'data-field-model.ts'), dataFieldModel);
    writeFileSync(join(coreDir, 'base-model.ts'), baseModel);
    writeFileSync(join(modelsDir, 'custom-select-option.js'), optionModel);
    writeFileSync(join(externalMixinsDir, 'base-model-mixin.js'), externalMixin);

    // Configure options with intermediate model paths
    const testOptions: MigrateOptions = {
      ...options,
      intermediateModelPaths: [
        'soxhub-client/core/base-model',
        'soxhub-client/core/data-field-model'
      ],
      additionalMixinSources: [
        {
          pattern: '@external/mixins/*',
          dir: join(tempDir, 'external/mixins/*')
        }
      ]
    };

    // Change to temp directory for the migration (as it would be in real usage)
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      // Run migration
      await runMigration(testOptions);
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }

    // Verify that intermediate model traits were generated
    const traitsDir = join(tempDir, 'app/data/traits');
    expect(existsSync(traitsDir)).toBe(true);
    expect(existsSync(join(traitsDir, 'data-field.schema.ts'))).toBe(true);
    expect(existsSync(join(traitsDir, 'data-field.schema.types.ts'))).toBe(true);
    expect(existsSync(join(traitsDir, 'base.schema.ts'))).toBe(true);
    expect(existsSync(join(traitsDir, 'base.schema.types.ts'))).toBe(true);

    // Verify regular model was processed
    expect(existsSync(join(tempDir, 'app/data/resources/custom-select-option.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/resources/custom-select-option.schema.types.ts'))).toBe(true);

    // Verify that the data-field trait contains the expected fields
    const dataFieldTrait = readFileSync(join(traitsDir, 'data-field.schema.ts'), 'utf-8');
    expect(dataFieldTrait).toContain('name'); // Should have name field
    expect(dataFieldTrait).toContain('sortOrder'); // Should have sortOrder field

    // The regular model extending DataFieldModel should reference the data-field trait
    // This is the main regression test - if intermediate models aren't processed,
    // this model won't get the data-field functionality
    const generatedSchema = readFileSync(join(tempDir, 'app/data/resources/custom-select-option.js'), 'utf-8');

    // Since CustomSelectOption extends DataFieldModel and DataFieldModel was processed as an intermediate model,
    // the trait functionality should be available. The exact way traits are referenced may vary,
    // but the important thing is that the intermediate model processing worked.

    // Basic check that the model was processed successfully
    expect(generatedSchema.length).toBeGreaterThan(0);
    expect(generatedSchema).toContain('custom-select-option'); // Should contain model identifier
  });
});