import type { API, FileInfo } from 'jscodeshift';
import transform from './model-to-schema.js';
import type { TransformOptions } from './utils/ast-utils.js';

/**
 * JSCodeshift wrapper for the model-to-schema transform
 * This bridges the jscodeshift API with the AST-grep based transform
 */
export default function (fileInfo: FileInfo, api: API, options: Partial<TransformOptions> = {}): string | undefined {
  // Skip if this doesn't look like a model file
  if (!fileInfo.path.includes('models/') && !fileInfo.source.includes('DS.Model') && !fileInfo.source.includes('@ember-data/model')) {
    return undefined;
  }

  try {
    // Create transform options with defaults
    const transformOptions: TransformOptions = {
      inputDir: options.inputDir || '.',
      outputDir: options.outputDir || './app/schemas',
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      ...options
    };

    // Use the original AST-grep based transform
    const result = transform(fileInfo.path, fileInfo.source, transformOptions);

    // If the transform made changes, return the modified source
    if (result !== fileInfo.source) {
      return result;
    }

    return undefined; // skipped
  } catch (error) {
    throw new Error(`model-to-schema transform failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}