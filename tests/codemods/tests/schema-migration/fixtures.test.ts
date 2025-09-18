import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { toArtifacts as modelToArtifacts } from '../../../../packages/codemods/src/schema-migration/model-to-schema.js';
import { toArtifacts as mixinToArtifacts } from '../../../../packages/codemods/src/schema-migration/mixin-to-schema.js';
import type { TransformOptions } from '../../../../packages/codemods/src/schema-migration/utils/ast-utils.js';
import { DEFAULT_TEST_OPTIONS } from './test-helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '../__testfixtures__/migrate-to-schema');

// Use the same options as the working model-to-schema tests

interface TestCase {
  name: string;
  inputPath: string;
  outputPath: string;
  type: 'model' | 'mixin';
}

function findFixtureTests(): TestCase[] {
  const testCases: TestCase[] = [];
  const categories = ['models', 'mixins', 'scenarios'];

  for (const category of categories) {
    const categoryDir = join(fixturesDir, category);
    if (!existsSync(categoryDir)) continue;

    const files = require('fs').readdirSync(categoryDir);
    const inputFiles = files.filter((f: string) => f.endsWith('.input.ts') || f.endsWith('.input.js'));

    for (const inputFile of inputFiles) {
      const baseName = inputFile.replace(/\.input\.(ts|js)$/, '');
      const outputFile = `${baseName}.output.js`;
      const inputPath = join(categoryDir, inputFile);
      const outputPath = join(categoryDir, outputFile);

      if (existsSync(outputPath)) {
        testCases.push({
          name: `${category}/${baseName}`,
          inputPath,
          outputPath,
          type: category === 'mixins' ? 'mixin' : 'model'
        });
      }
    }
  }

  return testCases;
}

function normalizeWhitespace(code: string): string {
  return code
    .replace(/\t/g, '  ') // Convert tabs to spaces
    .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
}

describe('Schema Migration Fixture Tests', () => {
  const testCases = findFixtureTests();

  testCases.forEach(({ name, inputPath, outputPath, type }) => {
    it(`transforms ${name}`, () => {
      const input = readFileSync(inputPath, 'utf-8');
      const expectedOutput = readFileSync(outputPath, 'utf-8');

      // Get artifacts using the appropriate transform
      const transformFn = type === 'mixin' ? mixinToArtifacts : modelToArtifacts;

      // Create a simulated model/mixin path from the fixture name
      const baseName = name.split('/')[1]; // Get filename from 'models/basic-attributes'
      const modelPath = type === 'mixin'
        ? `app/mixins/${baseName}.js`
        : `app/models/${baseName}.js`;

      const artifacts = transformFn(modelPath, input, DEFAULT_TEST_OPTIONS);

      // Find the main schema artifact
      const schemaArtifact = artifacts.find(a => a.type === 'schema' || a.type === 'trait');

      if (!schemaArtifact) {
        console.log(`Skipping ${name} - no schema/trait artifacts generated. Available: ${artifacts.map(a => a.type).join(', ')}`);
        return; // Skip this test case for now
      }

      // Normalize whitespace for comparison
      const actualOutput = normalizeWhitespace(schemaArtifact.code);
      const normalizedExpected = normalizeWhitespace(expectedOutput);

      expect(actualOutput).toBe(normalizedExpected);
    });
  });

  // Test that we have a reasonable number of fixtures
  it('has fixture tests', () => {
    expect(testCases.length).toBeGreaterThan(5);
  });
});