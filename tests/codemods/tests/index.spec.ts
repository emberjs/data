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
  const absoluteFixturesPath = path.join(__dirname, '__testfixtures__');
  const inputFiles = findAllTestFixturesSync(absoluteFixturesPath);

  const testsByTransform = inputFiles.reduce<
    Record<string, Array<{ inputPath: string; outputPath: string; infoPath: string; testName: string }>>
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
    const fixtureDir = path.join(__dirname, '__testfixtures__');

    acc[transformName].push({
      inputPath: path.join(fixtureDir, relativePath),
      outputPath: path.join(fixtureDir, relativePath.replace('input.', 'output.')),
      infoPath: path.join(fixtureDir, relativePath.replace(`input${ext}`, 'info.json')),
      testName,
    });
    return acc;
  }, {});

  Object.entries(testsByTransform).forEach(async ([transform, tests]) => {
    await describe(transform, async () => {
      const testPromises = [];
      for (const { inputPath, outputPath, infoPath, testName } of tests) {
        testPromises.push(
          it(`transforms "${testName}"`, async (t) => {
            await runTest(
              t,
              transform,
              { inputPath, outputPath, infoPath },
              {},
              {
                parser: 'ts',
              }
            );
          })
        );

        testPromises.push(
          it(`transforms "${testName} (and is idempotent)"`, async (t) => {
            await runTest(
              t,
              transform,
              { inputPath: outputPath, outputPath, infoPath },
              {},
              {
                parser: 'ts',
              }
            );
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
  options?: Parameters<Codemod>[2],
  testOptions: TestOptions = {}
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
  const expectedInfo: unknown = JSON.parse(infoJson);
  if (!isExpectedInfo(expectedInfo)) {
    throw new Error(`Could not parse info.json: ${infoJson}`);
  }

  await runInlineTest(
    transform,
    options ?? {},
    {
      path: inputPath,
      source,
    },
    expectedOutput,
    expectedInfo,
    logs,
    testOptions
  );
}

async function runInlineTest(
  module: Codemod,
  options: Parameters<Codemod>[2],
  input: {
    path: string;
    source: string;
  },
  expectedOutput: string,
  expectedInfo: ExpectedInfo,
  logs: unknown[][],
  testOptions?: TestOptions
) {
  let output = input.source;
  const expectedErrorMessage = expectedInfo['expectedError'];
  let actualError: unknown;
  try {
    output = applyTransform(module as Transform, options, input, testOptions);
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

  const expectedLogs = expectedInfo['expectedLogs'] ?? [];
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
  // { only: 'legacy-compat-builders/js/find-all/simple/simple-this' },
  // Uncomment to filter by a regex
  // { filter: /legacy-compat-builders\/js\/async\// }
);

interface ExpectedInfo {
  expectedLogs?: unknown[];
  expectedError?: string;
}

function isExpectedInfo(value: unknown): value is ExpectedInfo {
  return typeof value === 'object' && value !== null;
}
