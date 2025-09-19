import type { TransformOptions } from '../../../../packages/codemods/src/schema-migration/utils/ast-utils.js';

/**
 * Default test options that provide all required configuration
 * for testing transforms without hardcoded project-specific paths
 */
export const DEFAULT_TEST_OPTIONS: TransformOptions = {
  modelImportSource: 'test-app/models',
  resourcesImport: 'test-app/data/resources',
  verbose: false,
  debug: false,
};

/**
 * Create test options with overrides for specific test cases
 */
export function createTestOptions(overrides: Partial<TransformOptions> = {}): TransformOptions {
  return {
    ...DEFAULT_TEST_OPTIONS,
    ...overrides,
  };
}
