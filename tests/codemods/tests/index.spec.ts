/* eslint-disable no-console */

import type { Options, Transform } from 'jscodeshift';
import { applyTransform, type TestOptions } from 'jscodeshift/src/testUtils.js';
import * as fs from 'node:fs'; // for some reason allowSyntheticDefaultImports isn't working here
import * as path from 'node:path'; // for some reason allowSyntheticDefaultImports isn't working here

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
}

function runTests({ only }: RunTestsOptions = {}) {
  const absoluteFixturesPath = path.join(__dirname, '__testfixtures__');
  const inputFiles = findAllTestFixturesSync(absoluteFixturesPath);

  const testsByTransform = inputFiles.reduce<
    Record<string, Array<{ relativePath: string; ext: string; testName: string }>>
  >((acc, { filePath, ext }) => {
    const relativePath = path.relative(absoluteFixturesPath, filePath);

    if (only && only !== relativePath) {
      return acc;
    }

    const parts = relativePath.split(path.sep);
    const transformName = parts[0];
    const testName = parts.slice(1).join(path.sep);

    if (!acc[transformName]) {
      acc[transformName] = [];
    }
    acc[transformName].push({ relativePath, ext, testName });
    return acc;
  }, {});

  Object.entries(testsByTransform).forEach(([transform, tests]) => {
    describe(transform, () => {
      tests.forEach(({ relativePath, testName }) => {
        it(`transforms "${testName}"`, async () => {
          await runTest(__dirname, transform, relativePath, null, {
            parser: 'ts',
          });
        });
      });
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
  runInlineTest(
    transform,
    options ?? {},
    {
      path: inputPath,
      source,
    },
    expectedOutput,
    testOptions
  );

  let info = '{}';
  try {
    info = fs.readFileSync(inputPath.replace('input.js', 'info.json').replace('input.ts', 'info.json'), 'utf8');
  } catch {
    /* empty */
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const expectedLogs = JSON.parse(info).expectedLogs ?? [];
  expect(logs).toEqual(expectedLogs);

  console.warn = realLoggerWarn;
}

function runInlineTest(
  module:
    | {
        default: Transform;
        parser: TestOptions['parser'];
      }
    | Transform,
  options: Options,
  input: {
    path?: string;
    source: string;
  },
  expectedOutput: string,
  testOptions?: TestOptions
) {
  const output = applyTransform(module, options, input, testOptions);
  expect(output).toEqual(expectedOutput.trim());
  return output;
}

// prettier-ignore
runTests(
  // Uncomment to test only a specific fixture
  // { only: 'class-method/tracking' },
);
