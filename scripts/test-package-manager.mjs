import assert from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { rimraf } from 'rimraf';
import { tmpdir } from 'node:os';
import { mkdtemp, copyFile, cp, rm, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { $ } from 'execa';
import { globby } from 'globby';

import { gatherPackages } from '../release/utils/package.ts';
import { generatePackageTarballs } from '../release/core/publish/steps/generate-tarballs.ts';

const CWD = process.cwd();

/**
 * We don't test types for these packages
 * (they also don't end up in the browser)
 */
const IGNORED_PACKAGES = new Set(['@ember-data/codemods', 'eslint-plugin-warp-drive', 'warp-drive']);

const PROJECT_TO_USE = join(import.meta.dirname, '../tests/vite-basic-compat');

async function createTempFolder(prefix = 'tmp-') {
  const tempDir = tmpdir();
  const folderPath = await mkdtemp(join(tempDir, prefix));
  return folderPath;
}

async function publicPackages() {
  let { stdout } = await $({ preferLocal: true, shell: true })`pnpm ls --depth -1 -r --parseable`;

  let paths = stdout
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  let publicPaths = paths.filter((path) => {
    let manifestPath = join(path, 'package.json');
    let contents = readFileSync(manifestPath).toString();
    let isPrivate = contents.includes(`"private": true`);
    return !isPrivate;
  });

  return publicPaths;
}

async function buildAll(tag) {
  let publicPaths = await publicPackages();

  if (!tag) {
    /**
     * Simulates normal pnpm releasing
     */
    return await Promise.all(
      publicPaths.map((pkgPath) => {
        return $({ preferLocal: true, shell: true, cwd: pkgPath })(`pnpm pack`);
      })
    );
  }

  /**
   * Simulates part of an actual release
   * The version increment doesn't matter, as we aren't actually going to change the versions
   */
  const config = {
    channel: tag,
    increment: 'patch',
    get(key) {
      return this[key];
    },
  };

  /*
   * During actual publish, the whole strategy file is passed here for convinience,
   * but we don't need all of it for the tests
   */
  const packages = await gatherPackages({ packageRoots: ['packages/*', 'tests/*', 'config'] });

  /**
   * The applied stategy is mostly based off release/strategy.json
   * We want to change it dynamically for our test using the "tag"
   *
   * It's lies, as we're not changing the versions, but the release / build
   * code has different behavior based on channel
   */
  const strategy = new Map();
  for (let [pkgName, config] of packages.entries()) {
    if (config.pkgData.private) continue;
    if (IGNORED_PACKAGES.has(config.pkgData.name)) continue;

    strategy.set(pkgName, {
      stage: tag,
      types: tag,
      typesPublish: true,
      name: config.pkgData.name,
      private: false,
      disttag: tag,
    });
  }

  await generatePackageTarballs(config, packages, strategy);
}

async function debugTypes() {
  let entries = await globby('**/unstable-preview-types/index.d.ts', { ignore: ['**/node_modules', '**/dist'] });

  for (let entry of entries) {
    banner(entry);
    let contents = await readFile(entry);
    console.debug(contents.toString());
  }
}

async function deleteTars() {
  let tars = await globby('{tmp,packages}/**/*.tgz', { ignore: ['**/node_modules', '**/dist'] });

  await Promise.all(
    tars.map((tar) => {
      return rm(tar);
    })
  );
}

/**
 * Mostly only matters for local testing
 */
async function deletePriorBuildArtifacts() {
  // let outputs = await globby('**/{dist/(unstable-)?(preview-)?types', { ignore: ['**/node_modules'] });
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

async function copyTars(toDir) {
  let tars = await globby('{tmp/tarballs/,packages}/**/*.tgz', { ignore: ['**/node_modules', '**/dist'] });

  await Promise.all(
    tars.map((tar) => {
      let fileName = basename(tar);
      let fullSource = join(CWD, tar);
      let fullDestination = join(toDir, fileName);

      return copyFile(fullSource, fullDestination);
    })
  );
}
async function copyProject(toDir) {
  /**
   * Copies contents "into" toDir, rather than making a subfolder
   * of basename(PROJECT_TO_USE)
   */
  await cp(PROJECT_TO_USE, toDir, {
    recursive: true,
    filter: (source) => {
      let ignore = source.includes('node_modules') || source.includes('dist');

      return !ignore;
    },
  });

  return toDir;
}

async function fixManifest(projectDir) {
  let tars = await globby('*.tgz', { cwd: projectDir });

  let manifestPath = join(projectDir, 'package.json');
  let contents = readFileSync(manifestPath).toString();
  let json = JSON.parse(contents);

  delete json.dependenciesMeta;
  delete json.volta;

  json.resolutions ||= {};
  json.pnpm ||= {};
  json.pnpm.overrides ||= {};

  function tarByPrefix(hyphenated) {
    return tars.find((name) => name.match(new RegExp(`${hyphenated}-\\d`)));
  }

  for (let [depName, version] of Object.entries(json.devDependencies)) {
    if (!version.includes('workspace')) {
      continue;
    }

    let hyphenated = depName.replace('@', '').replace('/', '-');
    let local = tarByPrefix(hyphenated);

    if (!local) {
      console.warn(`
Could not find ${depName} (via ${hyphenated}) in list of tarballs:
${tars.map((x) => `\t${x}\n`).join('')}

  ${depName} will be omitted from this test project.
      `);
      delete json.devDependencies[depName];
      continue;
    }

    let fileProtocol = `file:./${local}`;
    json.devDependencies[depName] = fileProtocol;
    json.resolutions[depName] = fileProtocol;
    json.pnpm.overrides[depName] = fileProtocol;
  }

  writeFileSync(manifestPath, JSON.stringify(json, null, 2));
}

async function fixTSConfig(projectDir, tag) {
  let tsconfigPath = join(projectDir, 'tsconfig.json');
  let contents = readFileSync(tsconfigPath).toString();
  let json = JSON.parse(contents);

  delete json.references;

  const typesPath = tag === 'stable' ? 'types' : tag === 'beta' ? 'preview-types' : 'unstable-preview-types';

  json.glint = {
    environment: [],
  };
  json.compilerOptions.paths = {
    'vite-basic-compat/*': ['./app/*'],
    'vite-basic-compat/tests/*': ['./tess/*'],
  };
  json.compilerOptions.types = [
    'ember-source/types',
    '@embroider/core/virtual',
    `ember-data/${typesPath}`,
    `@ember-data/adapter/${typesPath}`,
    `@ember-data/debug/${typesPath}`,
    `@ember-data/json-api/${typesPath}`,
    `@ember-data/legacy-compat/${typesPath}`,
    `@ember-data/model/${typesPath}`,
    `@ember-data/request/${typesPath}`,
    `@ember-data/request-utils/${typesPath}`,
    `@ember-data/store/${typesPath}`,
    `@ember-data/serializer/${typesPath}`,
    `@ember-data/tracking/${typesPath}`,
  ];

  writeFileSync(tsconfigPath, JSON.stringify(json, null, 2));
}

async function runNoThrow(cwd, cmd) {
  try {
    return await $({ preferLocal: true, shell: true, cwd, stdio: 'inherit' })(cmd);
  } catch (e) {
    return e;
  }
}

async function install(packageManager, cwd) {
  // All package managers have an install command
  switch (packageManager) {
    case 'npm': {
      let manifestContent = readFileSync(join(cwd, 'package.json'));
      let manifest = JSON.parse(manifestContent);
      let toInstall = [];
      for (let [name, filePath] of Object.entries(manifest.devDependencies)) {
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
    default:
      await $({ preferLocal: true, shell: true, cwd, stdio: 'inherit' })`${packageManager} install`;
  }
}

async function typecheck(packageManager, cwd) {
  switch (packageManager) {
    case 'npm':
      return runNoThrow(cwd, `npm exec glint`);
    case 'yarn':
      return runNoThrow(cwd, `yarn glint`);
    case 'pnpm':
      return runNoThrow(cwd, `pnpm glint`);
  }
}
async function build(packageManager, cwd) {
  return runNoThrow(cwd, `${packageManager} run build`);
}

async function test(packageManager, cwd) {
  return runNoThrow(cwd, `${packageManager} run test:vite`);
}

function banner(text) {
  console.info(`
--------------------------------

    ${text}

--------------------------------
  `);
}

const SUPPORTED = new Set(['npm', 'yarn', 'pnpm']);
const TAGS = new Set(['alpha', 'beta', 'stable']);

async function main() {
  const [, , packageManager, tag, ...options] = process.argv;

  assert(
    SUPPORTED.has(packageManager),
    `Expected passed arg, the packageManager (${packageManager}), to be one of ${[...SUPPORTED.values()].join(', ')}`
  );

  if (tag && tag !== 'false') {
    assert(TAGS.has(tag), `Expected passed arg, the tag (${tag}), to be one of ${[...TAGS.values()].join(', ')}`);
  }

  /**
   * Useful if we already built tars,
   * when we're doing repeat-testing.
   *
   * (by far the slowest part of these tests is the tar building (and their prep))
   */
  const reuseTars = options.includes('--reuse-tars');

  if (!reuseTars) {
    await deletePriorBuildArtifacts();
    await deleteTars();
    await $({ preferLocal: true, shell: true, stdio: 'inherit' })`pnpm prepare`;
    await buildAll(tag);
  }

  await debugTypes();

  let tmpDir = await createTempFolder();
  let projectDir = await copyProject(tmpDir);

  banner(`To debug this test run, the project is located at ${projectDir}`);

  await copyTars(projectDir);
  await fixManifest(projectDir);
  await fixTSConfig(projectDir);

  banner('install');
  await install(packageManager, projectDir);

  banner('typecheck');
  let typesResult = await typecheck(packageManager, projectDir);
  banner('build');
  let buildResult = await build(packageManager, projectDir);
  banner('test');
  let testResult = await test(packageManager, projectDir);

  console.info(`
    Using: ${packageManager};
    In: ${projectDir}

    types: ${typesResult.exitCode === 0 ? 'Success' : 'Failure'}
    build: ${buildResult.exitCode === 0 ? 'Success' : 'Failure'}
    test: ${testResult.exitCode === 0 ? 'Success' : 'Failure'}
  `);

  process.exit(typesResult.exitCode || buildResult.exitCode || testResult.exitCode);
}

await main();
