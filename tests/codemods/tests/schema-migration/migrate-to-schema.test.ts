import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { runMigration } from '../../../../packages/codemods/src/schema-migration/migrate-to-schema.js';
import type { TransformOptions } from '../../../../packages/codemods/src/schema-migration/utils/ast-utils.js';

describe('migrate-to-schema batch operation', () => {
  let tempDir: string;
  let options: TransformOptions;

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
    const dryRunOptions = { ...options, dryRun: true };
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
    const modelsOnlyOptions = { ...options, modelsOnly: true };
    await runMigration(modelsOnlyOptions);

    // Check that only model artifacts were generated
    expect(existsSync(join(tempDir, 'app/data/resources/user.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'app/data/traits/common.js'))).toBe(false);
  });
});