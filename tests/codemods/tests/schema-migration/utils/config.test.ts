/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ConfigOptions } from '../../../../../packages/codemods/src/schema-migration/utils/config.js';
import {
  loadConfig,
  mergeOptions,
  normalizeCliPaths,
  resolveConfigPaths,
  saveConfig,
  validateConfigForTransform,
} from '../../../../../packages/codemods/src/schema-migration/utils/config.js';

const TEST_CONFIG_DIR = join(__dirname, 'fixtures', 'config-test');

describe('config utils', () => {
  beforeEach(() => {
    // Create test directory
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should load a valid configuration file and resolve relative paths', () => {
      const config = {
        $schema: './config-schema.json',
        version: '1.0.0',
        description: 'Test config',
        dryRun: true,
        verbose: false,
        mirror: true,
        traitsDir: './traits',
        extensionsDir: './extensions',
        typeMapping: {
          uuid: 'string',
          currency: 'number',
        },
      };

      const configPath = join(TEST_CONFIG_DIR, 'test.config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = loadConfig(configPath);

      // Paths should be resolved relative to the config file's directory
      expect(result).toEqual({
        dryRun: true,
        verbose: false,
        mirror: true,
        traitsDir: join(TEST_CONFIG_DIR, 'traits'),
        extensionsDir: join(TEST_CONFIG_DIR, 'extensions'),
        typeMapping: {
          uuid: 'string',
          currency: 'number',
        },
      });
    });

    it('should strip metadata fields from config', () => {
      const config = {
        $schema: './config-schema.json',
        version: '1.0.0',
        description: 'Test config',
        mirror: true,
      };

      const configPath = join(TEST_CONFIG_DIR, 'metadata.config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = loadConfig(configPath);

      expect(result).toEqual({ mirror: true });
      expect(result).not.toHaveProperty('$schema');
      expect(result).not.toHaveProperty('version');
      expect(result).not.toHaveProperty('description');
    });

    it('should throw error for non-existent file', () => {
      const configPath = join(TEST_CONFIG_DIR, 'nonexistent.config.json');

      expect(() => loadConfig(configPath)).toThrow('Configuration file not found');
    });

    it('should throw error for invalid JSON', () => {
      const configPath = join(TEST_CONFIG_DIR, 'invalid.config.json');
      writeFileSync(configPath, '{ invalid json }');

      expect(() => loadConfig(configPath)).toThrow('Failed to parse configuration file');
    });
  });

  describe('saveConfig', () => {
    it('should save configuration with metadata', () => {
      const options: ConfigOptions = {
        dryRun: true,
        verbose: false,
        mirror: true,
        traitsDir: './traits',
        typeMapping: {
          uuid: 'string',
        },
      };

      const configPath = join(TEST_CONFIG_DIR, 'save-test.config.json');
      saveConfig(configPath, options);

      expect(existsSync(configPath)).toBe(true);

      const saved = JSON.parse(readFileSync(configPath, 'utf8'));
      expect(saved).toEqual({
        $schema: './config-schema.json',
        version: '1.0.0',
        description: 'Configuration for warp-drive-codemod',
        dryRun: true,
        verbose: false,
        mirror: true,
        traitsDir: './traits',
        typeMapping: {
          uuid: 'string',
        },
      });
    });

    it('should handle empty options', () => {
      const options: ConfigOptions = {};
      const configPath = join(TEST_CONFIG_DIR, 'empty.config.json');

      saveConfig(configPath, options);

      const saved = JSON.parse(readFileSync(configPath, 'utf8'));
      expect(saved).toEqual({
        $schema: './config-schema.json',
        version: '1.0.0',
        description: 'Configuration for warp-drive-codemod',
      });
    });

    it('should handle file system errors', () => {
      const options: ConfigOptions = { mirror: true };
      const invalidPath = '/invalid/path/config.json';

      expect(() => saveConfig(invalidPath, options)).toThrow('Failed to save configuration file');
    });
  });

  describe('mergeOptions', () => {
    it('should merge CLI options with config options, CLI taking precedence', () => {
      const configOptions: ConfigOptions = {
        dryRun: false,
        verbose: true,
        mirror: false,
        traitsDir: './config-traits',
        extensionsDir: './config-extensions',
        typeMapping: {
          uuid: 'string',
          currency: 'number',
        },
      };

      const cliOptions: ConfigOptions = {
        dryRun: true,
        traitsDir: './cli-traits',
        typeMapping: {
          uuid: 'string',
          json: 'unknown',
        },
      };

      const result = mergeOptions(cliOptions, configOptions);

      expect(result).toEqual({
        dryRun: true, // CLI override
        verbose: true, // from config
        mirror: false, // from config
        traitsDir: './cli-traits', // CLI override
        extensionsDir: './config-extensions', // from config
        typeMapping: {
          uuid: 'string',
          json: 'unknown',
        }, // CLI override
      });
    });

    it('should handle undefined CLI options', () => {
      const configOptions: ConfigOptions = {
        dryRun: false,
        verbose: true,
        traitsDir: './traits',
      };

      const cliOptions: ConfigOptions = {
        dryRun: undefined,
        verbose: undefined,
        extensionsDir: './extensions',
      };

      const result = mergeOptions(cliOptions, configOptions);

      expect(result).toEqual({
        dryRun: false, // from config (CLI undefined)
        verbose: true, // from config (CLI undefined)
        traitsDir: './traits', // from config
        extensionsDir: './extensions', // from CLI
      });
    });

    it('should work with empty config options', () => {
      const cliOptions: ConfigOptions = {
        dryRun: true,
        traitsDir: './traits',
      };

      const result = mergeOptions(cliOptions, {});

      expect(result).toEqual({
        dryRun: true,
        traitsDir: './traits',
      });
    });

    it('should work with empty CLI options', () => {
      const configOptions: ConfigOptions = {
        verbose: true,
        extensionsDir: './extensions',
      };

      const result = mergeOptions({}, configOptions);

      expect(result).toEqual({
        verbose: true,
        extensionsDir: './extensions',
      });
    });
  });

  describe('resolveConfigPaths', () => {
    it('should resolve relative paths relative to base directory', () => {
      const config: ConfigOptions = {
        traitsDir: './traits',
        extensionsDir: '../extensions',
        resourcesDir: 'schemas',
        mirror: true,
      };

      const baseDir = '/projects/my-app/config';
      const result = resolveConfigPaths(config, baseDir);

      expect(result).toEqual({
        traitsDir: '/projects/my-app/config/traits',
        extensionsDir: '/projects/my-app/extensions',
        resourcesDir: '/projects/my-app/config/schemas',
        mirror: true,
      });
    });

    it('should leave absolute paths unchanged', () => {
      const config: ConfigOptions = {
        traitsDir: '/absolute/path/traits',
        extensionsDir: '/another/absolute/path',
        resourcesDir: './relative/path',
      };

      const baseDir = '/projects/my-app/config';
      const result = resolveConfigPaths(config, baseDir);

      expect(result).toEqual({
        traitsDir: '/absolute/path/traits',
        extensionsDir: '/another/absolute/path',
        resourcesDir: '/projects/my-app/config/relative/path',
      });
    });

    it('should handle empty or undefined paths', () => {
      const config: ConfigOptions = {
        traitsDir: '',
        extensionsDir: undefined,
        resourcesDir: './schemas',
        verbose: true,
      };

      const baseDir = '/projects/my-app';
      const result = resolveConfigPaths(config, baseDir);

      expect(result).toEqual({
        traitsDir: '',
        extensionsDir: undefined,
        resourcesDir: '/projects/my-app/schemas',
        verbose: true,
      });
    });

    it('should not modify non-path properties', () => {
      const config: ConfigOptions = {
        traitsDir: './traits',
        dryRun: true,
        verbose: false,
        mirror: true,
        emberDataImportSource: '@ember-data/model',
        typeMapping: { uuid: 'string' },
      };

      const baseDir = '/base';
      const result = resolveConfigPaths(config, baseDir);

      expect(result).toEqual({
        traitsDir: '/base/traits',
        dryRun: true,
        verbose: false,
        mirror: true,
        emberDataImportSource: '@ember-data/model',
        typeMapping: { uuid: 'string' },
      });
    });
  });

  describe('normalizeCliPaths', () => {
    it('should resolve relative paths relative to cwd', () => {
      const originalCwd = process.cwd();
      const config: ConfigOptions = {
        traitsDir: './traits',
        extensionsDir: '../extensions',
        resourcesDir: 'schemas',
      };

      const result = normalizeCliPaths(config);

      expect(result).toEqual({
        traitsDir: join(originalCwd, 'traits'),
        extensionsDir: join(originalCwd, '..', 'extensions'),
        resourcesDir: join(originalCwd, 'schemas'),
      });
    });

    it('should use custom cwd when provided', () => {
      const config: ConfigOptions = {
        traitsDir: './traits',
        extensionsDir: 'extensions',
      };

      const customCwd = '/custom/working/dir';
      const result = normalizeCliPaths(config, customCwd);

      expect(result).toEqual({
        traitsDir: '/custom/working/dir/traits',
        extensionsDir: '/custom/working/dir/extensions',
      });
    });

    it('should leave absolute paths unchanged', () => {
      const config: ConfigOptions = {
        traitsDir: '/absolute/path/traits',
        extensionsDir: '/another/absolute/path',
      };

      const result = normalizeCliPaths(config);

      expect(result).toEqual({
        traitsDir: '/absolute/path/traits',
        extensionsDir: '/another/absolute/path',
      });
    });

    it('should handle empty config', () => {
      const result = normalizeCliPaths({});
      expect(result).toEqual({});
    });
  });

  describe('validateConfigForTransform', () => {
    it('should validate model-to-schema transform requirements', () => {
      const validConfig: ConfigOptions = {
        modelImportSource: 'test-app/models',
        resourcesImport: 'test-app/data/resources',
        resourcesDir: './schemas',
        extensionsDir: './extensions',
      };

      const errors = validateConfigForTransform(validConfig, 'model-to-schema');
      expect(errors).toEqual([]);
    });

    it('should return errors for missing model-to-schema requirements', () => {
      const invalidConfig: ConfigOptions = {
        traitsDir: './traits',
      };

      const errors = validateConfigForTransform(invalidConfig, 'model-to-schema');
      expect(errors).toEqual([
        'modelImportSource is required for all transforms',
        'resourcesImport is required for all transforms',
        'resourcesDir is required for model-to-schema transforms',
        'extensionsDir is required for model-to-schema transforms',
      ]);
    });

    it('should validate mixin-to-schema transform requirements', () => {
      const validConfig: ConfigOptions = {
        modelImportSource: 'test-app/models',
        resourcesImport: 'test-app/data/resources',
        traitsDir: './traits',
        extensionsDir: './extensions',
      };

      const errors = validateConfigForTransform(validConfig, 'mixin-to-schema');
      expect(errors).toEqual([]);
    });

    it('should return errors for missing mixin-to-schema requirements', () => {
      const invalidConfig: ConfigOptions = {
        resourcesDir: './schemas',
      };

      const errors = validateConfigForTransform(invalidConfig, 'mixin-to-schema');
      expect(errors).toEqual([
        'modelImportSource is required for all transforms',
        'resourcesImport is required for all transforms',
        'traitsDir is required for mixin-to-schema transforms',
        'extensionsDir is required for mixin-to-schema transforms',
      ]);
    });

    it('should handle partial missing requirements', () => {
      const partialConfig: ConfigOptions = {
        modelImportSource: 'test-app/models',
        resourcesImport: 'test-app/data/resources',
        traitsDir: './traits',
        // missing extensionsDir
      };

      const errors = validateConfigForTransform(partialConfig, 'mixin-to-schema');
      expect(errors).toEqual(['extensionsDir is required for mixin-to-schema transforms']);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: save, load, merge, validate', () => {
      // Save a config
      const originalConfig: ConfigOptions = {
        dryRun: false,
        verbose: true,
        mirror: false,
        emberDataImportSource: '@ember-data/model',
        modelImportSource: 'test-app/models',
        resourcesImport: 'test-app/data/resources',
        traitsDir: './traits',
        extensionsDir: './extensions',
        typeMapping: {
          uuid: 'string',
        },
      };

      const configPath = join(TEST_CONFIG_DIR, 'workflow.config.json');
      saveConfig(configPath, originalConfig);

      // Load the config (paths are resolved relative to config file)
      const loadedConfig = loadConfig(configPath);

      // Merge with CLI options
      const cliOptions: ConfigOptions = {
        dryRun: true,
        traitsDir: './cli-traits',
      };

      const mergedConfig = mergeOptions(cliOptions, loadedConfig);

      // Validate
      const errors = validateConfigForTransform(mergedConfig, 'mixin-to-schema');

      expect(errors).toEqual([]);
      expect(mergedConfig).toEqual({
        dryRun: true, // overridden by CLI
        verbose: true, // from config
        mirror: false, // from config
        emberDataImportSource: '@ember-data/model', // from config
        modelImportSource: 'test-app/models', // from config
        resourcesImport: 'test-app/data/resources', // from config
        traitsDir: './cli-traits', // overridden by CLI (not resolved yet)
        extensionsDir: join(TEST_CONFIG_DIR, 'extensions'), // from config (resolved)
        typeMapping: {
          uuid: 'string',
        }, // from config
      });
    });

    it('should handle type mapping merging correctly', () => {
      const configOptions: ConfigOptions = {
        typeMapping: {
          uuid: 'string',
          currency: 'number',
          date: 'Date',
        },
      };

      const cliOptions: ConfigOptions = {
        typeMapping: {
          uuid: 'string', // same value
          currency: 'bigint', // different value
          json: 'unknown', // new value
          // date is omitted
        },
      };

      const result = mergeOptions(cliOptions, configOptions);

      // CLI typeMapping completely replaces config typeMapping
      expect(result.typeMapping).toEqual({
        uuid: 'string',
        currency: 'bigint',
        json: 'unknown',
      });
    });
  });
});
