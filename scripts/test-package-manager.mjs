import assert from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { mkdtemp, copyFile, cp, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { $ } from 'execa';
import { globby } from 'globby';

import { gatherPackages, loadStrategy } from '../release/utils/package.ts';
import { generatePackageTarballs } from '../release/core/publish/steps/generate-tarballs.ts';
import { applyStrategy } from '../release/core/publish/steps/generate-strategy.ts';

const CWD = process.cwd();

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
  const strategy = await loadStrategy();
  const packages = await gatherPackages(strategy.config);
  const applied = await applyStrategy(config, strategy, packages, packages);

  /**
   * The applied stategy is mostly based off release/strategy.json
   * We want to change it dynamically for our test using the "tag"
   *
   * It's lies, as we're not changing the versions, but the release / build
   * code has different behavior based on channel
   */
  for (let [pkgName, config] of Object.entries(applied.public_pks)) {
    applied.public_pks[pkgName] = {
      ...config,
      stage: tag,
      types: tag,
    };
  }

  await generatePackageTarballs(config, packages, applied.public_pks);
}

async function deleteTars() {
  let tars = await globby('{tmp,packages}/**/*.tgz', { ignore: ['**/node_modules', '**/dist'] });

  await Promise.all(
    tars.map((tar) => {
      return rm(tar);
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
    return tars.find((name) => name.startsWith(hyphenated));
  }

  for (let [depName, version] of Object.entries(json.devDependencies)) {
    if (!version.includes('workspace')) {
      continue;
    }

    let local = tarByPrefix(depName.replace('@', '').replace('/', '-'));

    if (!local) {
      console.warn(`
Could not find ${depName} in list of tarballs: 
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

async function fixTSConfig(projectDir) {
  let tsconfigPath = join(projectDir, 'tsconfig.json');
  let contents = readFileSync(tsconfigPath).toString();
  let json = JSON.parse(contents);

  delete json.references;

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
    // 'ember-data/unstable-preview-types',
    // '@ember-data/request/unstable-preview-types',
    // TODO: etc
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
  await $({ preferLocal: true, shell: true, cwd, stdio: 'inherit' })`${packageManager} install`;
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
  const [, , packageManager, tag] = process.argv;

  assert(
    SUPPORTED.has(packageManager),
    `Expected passed arg, the packageManager (${packageManager}), to be one of ${[...SUPPORTED.values()].join(', ')}`
  );

  if (tag) {
    assert(TAGS.has(tag), `Expected passed arg, the tag (${tag}), to be one of ${[...TAGS.values()].join(', ')}`);
  }

  await deleteTars();
  await buildAll(tag);

  let tmpDir = await createTempFolder();
  let projectDir = await copyProject(tmpDir);

  console.debug(`To debug this test run, the project is located at ${projectDir}`);

  await copyTars(projectDir);
  await fixManifest(projectDir);
  await fixTSConfig(projectDir);

  banner('typecheck');
  await install(packageManager, projectDir);
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
