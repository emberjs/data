import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { processIntermediateModelsToTraits } from '../../../../packages/codemods/src/schema-migration/model-to-schema.js';

describe('intermediate model processing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'intermediate-models-test-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should process intermediate models with proper path resolution using additionalModelSources', () => {
    // Create a test intermediate model
    const coreDir = join(tempDir, 'app/core');
    mkdirSync(coreDir, { recursive: true });

    const baseModelContent = `
import Model from '@ember-data/model';
import { attr } from '@ember-data/model';

export default class BaseModel extends Model {
  @attr('string') name;
  @attr('boolean') isActive;
}
`;

    writeFileSync(join(coreDir, 'base-model.js'), baseModelContent);

    // Test intermediate model processing with proper config mapping
    const result = processIntermediateModelsToTraits(
      ['test-app/core/base-model'],
      [
        {
          pattern: 'test-app/core/*',
          dir: join(tempDir, 'app/core/*')
        }
      ], // additional model sources with mapping
      undefined, // no additional mixin sources
      {
        verbose: false,
        debug: false,
      }
    );

    // Should successfully process the intermediate model
    expect(result.errors.length).toBe(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it('should use additionalModelSources for path resolution', () => {
    // Create a test intermediate model in a non-standard location
    const libDir = join(tempDir, 'libraries/core/src');
    mkdirSync(libDir, { recursive: true });

    const specialModelContent = `
import Model from '@ember-data/model';
import { attr } from '@ember-data/model';

export default class SpecialModel extends Model {
  @attr('string') specialName;
  @attr('number') priority;
}
`;

    writeFileSync(join(libDir, 'special-model.ts'), specialModelContent);

    // Test with additionalModelSources mapping
    const result = processIntermediateModelsToTraits(
      ['@mylib/core/special-model'],
      [
        {
          pattern: '@mylib/core/special-model',
          dir: join(tempDir, 'libraries/core/src/special-model')
        }
      ],
      undefined,
      {
        verbose: false,
        debug: false,
      }
    );

    // Should successfully resolve and process the model
    expect(result.errors.length).toBe(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it('should report errors for missing intermediate models', () => {
    const result = processIntermediateModelsToTraits(
      ['non-existent/model'],
      undefined,
      undefined,
      {
        verbose: false,
        debug: false,
      }
    );

    // Should report error for missing model
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Could not find or read intermediate model file for path: non-existent/model');
    expect(result.artifacts.length).toBe(0);
  });
});