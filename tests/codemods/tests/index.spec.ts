#!/usr/bin/env ts-node

import type { Transform } from 'jscodeshift';
import { applyTransform, type TestOptions } from 'jscodeshift/src/testUtils.js';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs'; // for some reason allowSyntheticDefaultImports isn't working here
import * as path from 'node:path'; // for some reason allowSyntheticDefaultImports isn't working here
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

import { Codemods, Logs } from '@ember-data/codemods';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

type Codemod = Codemods[keyof Codemods];

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
  const fixtureDir = path.join(__dirname, '__testfixtures__');
  const inputFiles = findAllTestFixturesSync(fixtureDir);

  const testsByTransform = inputFiles.reduce<
    Record<string, Array<{ inputPath: string; outputPath: string; infoPath: string; testName: string }>>
  >((acc, { filePath, ext }) => {
    const relativePath = path.relative(fixtureDir, filePath);

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

    acc[transformName].push({
      inputPath: path.join(fixtureDir, relativePath),
      outputPath: path.join(fixtureDir, relativePath.replace('input.', 'output.')),
      infoPath: path.join(fixtureDir, relativePath.replace(`input${ext}`, 'info.json')),
      testName,
    });
    return acc;
  }, {});

  Object.entries(testsByTransform).forEach(async ([transform, tests]) => {
    const defaultOptionsPath = path.join(fixtureDir, transform, 'default-options.json');
    const defaultOptionsJson = fs.existsSync(defaultOptionsPath) ? fs.readFileSync(defaultOptionsPath, 'utf8') : '{}';
    const defaultOptions: unknown = JSON.parse(defaultOptionsJson);
    if (!isOptions(defaultOptions)) {
      throw new Error(`Could not parse ${defaultOptionsPath}: ${defaultOptionsJson}`);
    }

    await describe(transform, async () => {
      const testPromises = [];
      for (const { inputPath, outputPath, infoPath, testName } of tests) {
        testPromises.push(
          it(`transforms "${testName}"`, async (t) => {
            await runTest(t, transform, { inputPath, outputPath, infoPath }, defaultOptions, {
              parser: 'ts',
            });
          })
        );

        testPromises.push(
          it(`transforms "${testName} (and is idempotent)"`, async (t) => {
            await runTest(t, transform, { inputPath: outputPath, outputPath, infoPath }, defaultOptions, {
              parser: 'ts',
            });
          })
        );
      }

      await Promise.all(testPromises);
    });
  });
}

function toLogMessage(message: unknown): string[] {
  if (typeof message === 'string') {
    return [message.trim()];
  }
  if (Array.isArray(message)) {
    return message.flatMap(toLogMessage);
  }
  if (typeof message === 'object' && message !== null && 'message' in message) {
    return toLogMessage(message['message']);
  }
  return [JSON.stringify(message)];
}

async function runTest(
  t: Parameters<Exclude<Parameters<typeof it>[0], undefined>>[0],
  transformName: string,
  { inputPath, outputPath, infoPath }: { inputPath: string; outputPath: string; infoPath: string },
  defaultOptions: Parameters<Codemod>[2],
  testOptions: TestOptions
): Promise<void> {
  if (!(transformName in Codemods)) {
    throw new Error('No codemod found for ' + transformName);
  }
  const transform = Codemods[transformName as keyof typeof Codemods];

  if (!(transformName in Logs)) {
    throw new Error('No log found for ' + transformName);
  }
  const logs: Array<unknown[]> = [];
  const log = Logs[transformName as keyof typeof Logs];
  t.mock.method(log._logger, 'log', (level: string, message: unknown) => {
    logs.push([level, ...toLogMessage(message)]);
  });

  const source = fs.readFileSync(inputPath, 'utf8');
  const expectedOutput = fs.readFileSync(outputPath, 'utf8');
  const infoJson = fs.existsSync(infoPath) ? fs.readFileSync(infoPath, 'utf8') : '{}';
  const info: unknown = JSON.parse(infoJson);
  if (!isTestInfo(info)) {
    throw new Error(`Could not parse ${infoPath}: ${infoJson}`);
  }

  await runInlineTest(
    transform,
    defaultOptions,
    {
      path: inputPath,
      source,
    },
    expectedOutput,
    info,
    logs,
    testOptions
  );
}

async function runInlineTest(
  module: Codemod,
  defaultOptions: Parameters<Codemod>[2],
  input: {
    path: string;
    source: string;
  },
  expectedOutput: string,
  info: TestInfo,
  logs: unknown[][],
  testOptions?: TestOptions
) {
  let output = input.source;
  const options: Parameters<Codemod>[2] = info.options ? { ...defaultOptions, ...info.options } : defaultOptions;

  const expectedErrorMessage = info.expectedError;
  let actualError: unknown;
  try {
    output = applyTransform(module as Transform, options, input, testOptions || undefined);
  } catch (error: unknown) {
    actualError = error;
  }
  if (expectedErrorMessage && actualError) {
    assert.strictEqual((actualError as Error).message, expectedErrorMessage, 'Error message did not match expected.');
  } else if (expectedErrorMessage) {
    assert.fail(`Expected an error but none was thrown: ${expectedErrorMessage}`);
  } else if (actualError instanceof Error) {
    throw actualError;
  } else if (actualError) {
    throw new Error(`Invalid error: ${String(actualError)}`);
  }

  const expectedLogs = info['expectedLogs'] ?? [];
  assert.deepStrictEqual(logs, expectedLogs, 'Logged messages did not match expected.');

  const prettierConfig = await prettier.resolveConfig(input.path);
  if (!prettierConfig) {
    throw new Error('Could not resolve prettier config');
  }
  const formattedOutput = await prettier.format(output, { ...prettierConfig, filepath: input.path });
  assert.strictEqual(formattedOutput, expectedOutput, 'Transformed output did not match expected.');
}

// prettier-ignore
runTests(
  // Uncomment to test only a specific fixture
  // { only: 'legacy-compat-builders/js/async/no-await-in-model-hook' },
  // Uncomment to filter by a regex
  // { filter: /legacy-compat-builders\/js\/async\// }
);

interface TestInfo {
  expectedLogs?: unknown[];
  expectedError?: string;
  options?: Parameters<Codemod>[2];
}

function isTestInfo(value: unknown): value is TestInfo {
  return typeof value === 'object' && value !== null;
}

function isOptions(value: unknown): value is Parameters<Codemod>[2] {
  return typeof value === 'object' && value !== null;
}
