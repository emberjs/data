import assert from 'node:assert';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rimraf } from 'rimraf';
import { copyFile, rm, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { $ } from 'execa';
import { globby } from 'globby';

export const SUPPORTED = new Set(['npm', /* 'yarn', */ 'pnpm']);
export const CWD = process.cwd();
export const SMOKE_TESTS = join(CWD, 'tests', 'smoke-tests');
export const ALL_SMOKES = new Set(readdirSync(SMOKE_TESTS));

export async function debugTypes() {
  let entries = await globby('**/unstable-preview-types/index.d.ts', { ignore: ['**/node_modules', '**/dist'] });

  for (let entry of entries) {
    banner(entry);
    let contents = await readFile(entry);
    console.debug(contents.toString());
  }
}

export function banner(text) {
  console.info(`
--------------------------------

    ${text}

--------------------------------
  `);
}

export async function typecheck(packageManager: string, cwd: string) {
  switch (packageManager) {
    case 'npm':
      return runNoThrow(cwd, `npm exec glint`);
    case 'yarn':
      return runNoThrow(cwd, `yarn glint`);
    case 'pnpm':
      return runNoThrow(cwd, `pnpm glint`);
  }
}
export async function build(packageManager: string, cwd: string) {
  return runNoThrow(cwd, `${packageManager} run build`);
}

export async function test(packageManager: string, cwd: string) {
  return runNoThrow(cwd, `${packageManager} run test:vite`);
}

export async function copyTars(toDir: string) {
  let tars = await globby('{tmp/tarballs/,packages}/**/*.tgz', { ignore: ['**/node_modules', '**/dist'] });

  await Promise.all(
    tars.map((tar) => {
      let fileName = basename(tar);

      let hitNumber = false;
      let cleanedFileName =
        fileName
          .split('-')
          .filter((x) => {
            if (hitNumber) return false;
            if (x.match(/\d/)) {
              hitNumber = true;
              return false;
            }

            return true;
          })
          .join('-') + '.tgz';

      let fullSource = join(CWD, tar);
      // something easily git-ignorable and copyable
      let targetDir = join(toDir, 'packages');
      mkdirSync(targetDir, { recursive: true });

      let fullDestination = join(targetDir, cleanedFileName);

      return copyFile(fullSource, fullDestination);
    })
  );
}

/**
 * Mostly only matters for local testing
 */
export async function deletePriorBuildArtifacts() {
  let outputs = await globby('**/{dist,unstable-preview-types}/', {
    ignore: ['**/node_modules'],
    onlyDirectories: true,
  });

  outputs = outputs.map((x) => x.trim());

  await Promise.all(
    outputs.map((output) => {
      return rimraf(output);
    })
  );
}

export async function deleteTars() {
  let tars = await globby('{tmp,packages}/**/*.tgz', { ignore: ['**/node_modules', '**/dist'] });

  await Promise.all(
    tars.map((tar) => {
      return rm(tar);
    })
  );
}

export async function runNoThrow(cwd: string, cmd: string) {
  try {
    return await $({ preferLocal: true, shell: true, cwd, stdio: 'inherit' })(cmd);
  } catch (e) {
    return e;
  }
}

export async function install(packageManager: string, cwd: string) {
  // All package managers have an install command
  switch (packageManager) {
    case 'npm': {
      let manifestContent = readFileSync(join(cwd, 'package.json'));
      let manifest = JSON.parse(manifestContent.toString());
      let toInstall = [];
      for (let [name, filePath] of Object.entries(manifest.devDependencies)) {
        if (typeof filePath !== 'string') {
          console.warn(`${name} has filePath of unknown data type`);
          continue;
        }

        if (filePath.startsWith('file:')) {
          toInstall.push(filePath.replace('file:', ''));
          manifest.devDependencies[name] = '*';
        }
      }

      writeFileSync(join(cwd, 'package.json'), JSON.stringify(manifest, null, 2));

      console.log({ toInstall, manifest });

      let command = `npm install --save-dev ${toInstall.join(' ')} --force`;
      await $({
        preferLocal: true,
        shell: true,
        cwd,
        stdio: 'inherit',
      })(command);

      // npm complains about tgz files in the version specifier part of package.json
      await $({ preferLocal: true, shell: true, cwd, stdio: 'inherit' })`${packageManager} install --force`;
      return;
    }
    case 'pnpm':
      await $({ preferLocal: true, shell: true, cwd, stdio: 'inherit' })`${packageManager} install --ignore-workspace`;
      return;
    default:
      throw new Error(`Unrecognized packageManager: ${packageManager}`);
  }
}
