import assert from 'node:assert';
import { join } from 'node:path';
import { $ } from 'execa';

import {
  SUPPORTED,
  SMOKE_TESTS,
  ALL_SMOKES,
  deletePriorBuildArtifacts,
  deleteTars,
  debugTypes,
  banner,
  install,
  typecheck,
  copyTars,
} from './helpers.ts';
import { buildAll } from './prepare.ts';

async function main() {
  const [, , smokeTestDir, packageManager, ...options] = process.argv;

  assert(
    SUPPORTED.has(packageManager),
    `Expected passed arg, the packageManager (${packageManager}), to be one of ${[...SUPPORTED.values()].join(', ')}`
  );

  assert(
    ALL_SMOKES.has(smokeTestDir),
    `Expected passed arg, the smoke test directory (${smokeTestDir}), to be one of ${[...ALL_SMOKES.values()].join(', ')}`
  );

  /**
   * Useful if we already built tars,
   * when we're doing repeat-testing.
   *
   * (by far the slowest part of these tests is the tar building (and their prep))
   */
  const reuseTars = options.includes('--reuse-tars');
  const debug = options.includes('--debug');

  if (!reuseTars) {
    await deletePriorBuildArtifacts();
    await deleteTars();
    await $({ preferLocal: true, shell: true, stdio: 'inherit' })`pnpm prepare`;
    await buildAll();
  }

  if (debug) {
    await debugTypes();
  }

  let projectDir = join(SMOKE_TESTS, smokeTestDir);

  console.log(projectDir);

  banner(`To debug this test run, the project is located at ${projectDir}`);

  await copyTars(projectDir);

  banner('install');
  await install(packageManager, projectDir);

  banner('typecheck');
  let typesResult: any = await typecheck(packageManager, projectDir);

  console.info(`
    Using: ${packageManager};
    In: ${projectDir}

    types: ${typesResult.exitCode === 0 ? 'Success' : 'Failure'}
  `);

  process.exit(typesResult.exitCode);
}

await main();
