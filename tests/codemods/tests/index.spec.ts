#!/usr/bin/env ts-node
/* eslint-disable no-console */

import type { Options, Transform } from 'jscodeshift';
import { applyTransform, type TestOptions } from 'jscodeshift/src/testUtils.js';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs'; // for some reason allowSyntheticDefaultImports isn't working here
import * as path from 'node:path'; // for some reason allowSyntheticDefaultImports isn't working here
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

function findAllTestFixturesSync(dir: string, fileList: Array<{ filePath: string; ext: string }> = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((file) => {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      findAllTestFixturesSync(filePath, fileList);
    } else if (file.isFile() && (file.name.endsWith('.input.ts') || file.name.endsWith('.input.js'))) {
      fileList.push({ filePath, ext: path.extname(file.name) });
    }
  });
  return fileList;
}

interface RunTestsOptions {
  only?: string;
  filter?: RegExp;
}

function runTests({ only, filter }: RunTestsOptions = {}) {
  const absoluteFixturesPath = path.join(__dirname, '__testfixtures__');
  const inputFiles = findAllTestFixturesSync(absoluteFixturesPath);

  const testsByTransform = inputFiles.reduce<
    Record<string, Array<{ relativePath: string; ext: string; testName: string }>>
  >((acc, { filePath, ext }) => {
    const relativePath = path.relative(absoluteFixturesPath, filePath);

    if (filter && !filter.test(relativePath)) {
      return acc;
    }

    const parts = relativePath.split(path.sep);
    const transformName = parts[0];
    const testName = parts.slice(1).join(path.sep).replace('.input.ts', '').replace('.input.js', '');

    if (only && only !== `${transformName}/${testName}`) {
      return acc;
    }

    if (!acc[transformName]) {
      acc[transformName] = [];
    }
    acc[transformName].push({ relativePath, ext, testName });
    return acc;
  }, {});

  Object.entries(testsByTransform).forEach(async ([transform, tests]) => {
    await describe(transform, async () => {
      const testPromises = tests.map(({ relativePath, testName }) => {
        return it(`transforms "${testName}"`, async () => {
          await runTest(__dirname, transform, relativePath, null, {
            parser: 'ts',
          });
        });
      });
      await Promise.all(testPromises);
    });
  });
}

async function runTest(
  dirName: string,
  transformName: string,
  relativePath: string,
  options?: Options | null,
  testOptions: TestOptions = {}
): Promise<void> {
  const realLoggerWarn = console.warn;
  const logs: Array<unknown[]> = [];
  console.warn = (...args) => {
    logs.push(['warn', ...args]);
  };

  // Assumes transform is one level up from __tests__ directory

  const { default: codemods } = await import('@ember-data/codemods');

  if (!(transformName in codemods)) {
    throw new Error('No codemod found for ' + transformName);
  }

  // FIXME: Gave up on types here
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const transform: Transform = (codemods as any)[transformName];

  const fixtureDir = path.join(dirName, '__testfixtures__');
  const inputPath = path.join(fixtureDir, relativePath);
  const source = fs.readFileSync(inputPath, 'utf8');
  const expectedOutput = fs.readFileSync(inputPath.replace('input.', 'output.'), 'utf8');

  const infoJsonPath = inputPath.replace('input.js', 'info.json').replace('input.ts', 'info.json');
  const infoJson = fs.existsSync(infoJsonPath) ? fs.readFileSync(infoJsonPath, 'utf8') : '{}';
  const expectedInfo: unknown = JSON.parse(infoJson);
  if (!isExpectedInfo(expectedInfo)) {
    throw new Error(`Could not parse info.json: ${infoJson}`);
  }

  try {
    await runInlineTest(
      transform,
      options ?? {},
      {
        path: inputPath,
        source,
      },
      expectedOutput,
      testOptions
    );
  } catch (actualError: unknown) {
    const expectedError = expectedInfo['expectedError'];
    if (expectedError) {
      assert.strictEqual((actualError as Error).message, expectedError, 'Error message did not match expected.');
    } else {
      throw actualError;
    }
  }

  const expectedLogs = expectedInfo['expectedLogs'] ?? [];
  assert.deepStrictEqual(logs, expectedLogs, 'Logged messages did not match expected.');

  console.warn = realLoggerWarn;
}

async function runInlineTest(
  module:
    | {
        default: Transform;
        parser: TestOptions['parser'];
      }
    | Transform,
  options: Options,
  input: {
    path: string;
    source: string;
  },
  expectedOutput: string,
  testOptions?: TestOptions
) {
  const output = applyTransform(module, options, input, testOptions);
  const prettierConfig = await prettier.resolveConfig(input.path);
  if (!prettierConfig) {
    throw new Error('Could not resolve prettier config');
  }
  const formattedOutput = await prettier.format(output, { ...prettierConfig, filepath: input.path });
  assert.strictEqual(formattedOutput, expectedOutput);
}

// prettier-ignore
runTests(
  // Uncomment to test only a specific fixture
  // { only: 'legacy-compat-builders/ts/query-record/simple/with-options' },
  // Uncomment to filter by a regex
  // { filter: /js\// }
);

function isExpectedInfo(value: unknown): value is { expectedLogs?: unknown[]; expectedError?: string } {
  return typeof value === 'object' && value !== null;
}
