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
  const fixturesPath = path.join(__dirname, '__testfixtures__');
  const inputFiles = findAllTestFixturesSync(fixturesPath);

  const testsByTransform = inputFiles.reduce<Record<string, Array<{ testName: string; ext: string }>>>(
    (acc, { filePath, ext }) => {
      const relativePath = path.relative(fixturesPath, filePath);
      const transform = relativePath.split(path.sep).slice(0, -1).join(path.sep);
      const testName = path.basename(relativePath).replace('.input.ts', '').replace('.input.js', '');
      const fullPath = `${transform}/${testName}`;

      if (only && only !== fullPath) {
        return acc;
      }

      if (!acc[transform]) {
        acc[transform] = [];
      }
      acc[transform].push({ testName, ext });
      return acc;
    },
    {}
  );

  Object.entries(testsByTransform).forEach(([transform, tests]) => {
    describe(transform.replace(path.sep, ' > '), () => {
      tests.forEach(({ testName }) => {
        defineTest(__dirname, transform, testName, null, {
          parser: 'ts',
        });
      });
    });
  });
}

function defineTest(
  dirName: string,
  transformName: string,
  fixturesPath: string,
  options?: Options | null,
  testOptions?: TestOptions
): void {
  const testFilePrefix = `${transformName}/${fixturesPath}`;
  const testName = testFilePrefix ? `transforms correctly using "${testFilePrefix}" data` : 'transforms correctly';
  describe(transformName, () => {
    it(testName, async () => {
      await runTest(dirName, transformName, fixturesPath, options, testOptions);
    });
  });
}

async function runTest(
  dirName: string,
  transformName: string,
  fixturesPath: string,
  options?: Options | null,
  testOptions: TestOptions = {}
): Promise<void> {
  const realLoggerWarn = console.warn;
  const logs: Array<unknown[]> = [];
  console.warn = (...args) => {
    logs.push(['warn', ...args]);
  };

  const testFilePrefix = `${transformName}/${fixturesPath}`;

  // Assumes transform is one level up from __tests__ directory

  const { default: codemods } = await import('@ember-data/codemods');

  if (!(transformName in codemods)) {
    throw new Error('No codemod found for ' + transformName);
  }

  // FIXME: Gave up on types here
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const transform: Transform = (codemods as any)[transformName];

  const extension = extensionForParser(testOptions.parser);
  const fixtureDir = path.join(dirName, '__testfixtures__');
  const inputPath = path.join(fixtureDir, testFilePrefix + `.input.${extension}`);
  const source = fs.readFileSync(inputPath, 'utf8');
  const expectedOutput = fs.readFileSync(path.join(fixtureDir, testFilePrefix + `.output.${extension}`), 'utf8');
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
    info = fs.readFileSync(path.join(fixtureDir, testFilePrefix + `.info.json`), 'utf8');
  } catch {
    /* empty */
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const expectedLogs = JSON.parse(info).expectedLogs ?? [];
  expect(logs).toEqual(expectedLogs);

  console.warn = realLoggerWarn;
}

// TODO: Fix js tests
function extensionForParser(parser: TestOptions['parser']) {
  switch (parser) {
    case 'ts':
    case 'tsx':
      return parser;
    default:
      return 'js';
  }
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
