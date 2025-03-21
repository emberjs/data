#! /usr/bin/env bun
/**
 * Sets up the docs viewer app
 */
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';

const EMBER_API_DOCS_REPO = `git@github.com:ember-learn/ember-api-docs.git`;
const EMBER_JSONAPI_DOCS_REPO = `git@github.com:ember-learn/ember-jsonapi-docs.git`;
const EMBER_API_DOCS_DATA_REPO = `git@github.com:ember-learn/ember-api-docs-data.git`;

const workspaceRoot = (await findWorkspaceDir(process.cwd())) as string;

if (!workspaceRoot) {
  throw new Error('Could not find workspace root');
}

const docsViewerRoot = path.join(workspaceRoot, 'docs-viewer');

function log(message: string) {
  console.log(chalk.grey(`[docs-viewer]\t${message}`));
}

function repoDetails(gitUrl: string) {
  const repoPath = gitUrl.replace('.git', '').replace('git@github.com:', '');
  const [org, name] = repoPath.split('/');
  const installPathFromRoot = path.join('./projects', name);
  const location = path.join(docsViewerRoot, installPathFromRoot);

  return {
    org,
    name,
    repoPath,
    gitUrl,
    installPathFromRoot,
    location,
    relativePath: path.relative(__dirname, path.join(docsViewerRoot, installPathFromRoot)),
  };
}

async function getCurrentVersion(tool: string) {
  const proc = Bun.spawn([tool, '--version'], {
    env: process.env,
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  await proc.exited;
  const version = await new Response(proc.stdout).text();
  return version.trim().replace('v', '');
}

function determinePackageManager(dir: string) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) {
    return 'npm';
  }
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

async function getOrUpdateRepo(gitUrl: string) {
  const details = repoDetails(gitUrl);

  if (fs.existsSync(details.location)) {
    await getLatest(details);
  } else {
    await cloneRepo(details);
  }

  // install dependencies
  const packageManager = determinePackageManager(details.location);

  if (packageManager === 'pnpm') {
    // get the version to use from package.json
    const packageJson = require(path.join(details.location, 'package.json'));

    let nodeVersion = await getCurrentVersion('node');
    const pnpmVersion = await getCurrentVersion('pnpm');

    // ember-api-docs requires an older node due to node-sass
    if (packageJson.name === 'ember-api-docs') {
      nodeVersion = '20.19.0';
    }

    if (
      !packageJson.volta ||
      packageJson.volta.node !== nodeVersion ||
      packageJson.volta.pnpm !== pnpmVersion ||
      packageJson.packageManager ||
      packageJson.engines?.node !== nodeVersion
    ) {
      delete packageJson.packageManager;
      packageJson.volta = {
        node: nodeVersion,
        pnpm: pnpmVersion,
      };
      packageJson.engines = packageJson.engines || {};
      packageJson.engines.node = nodeVersion;

      fs.writeFileSync(path.join(details.location, 'package.json'), JSON.stringify(packageJson, null, 2));
      const proc = Bun.spawn(['git', 'commit', '-am', '"ensure volta works as expected"'], {
        cwd: details.location,
        env: process.env,
        stdio: ['inherit', 'inherit', 'inherit'],
      });
      await proc.exited;
    }
  }

  log(`Installing dependencies in ${chalk.green(details.installPathFromRoot)} using ${chalk.yellow(packageManager)}`);
  const proc = Bun.spawn(
    [packageManager, 'install', packageManager === 'pnpm' ? '--ignore-workspace' : ''].filter(Boolean),
    {
      cwd: details.location,
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit'],
    }
  );
  await proc.exited;
}

async function getLatest(details: ReturnType<typeof repoDetails>) {
  log(`Updating ${chalk.green(details.repoPath)} in ${chalk.green(details.installPathFromRoot)} to latest`);
  const mainBranch = details.name === 'ember-jsonapi-docs' ? 'master' : 'main';
  const proc = Bun.spawn(['git', 'fetch', 'origin', mainBranch, '--depth=1'], {
    cwd: details.location,
  });
  await proc.exited;
  const proc2 = Bun.spawn(['git', 'reset', '--hard', `origin/${mainBranch}`], {
    cwd: details.location,
  });
  await proc2.exited;
}

async function cloneRepo(details: ReturnType<typeof repoDetails>) {
  const relativePath = path.join('./projects', details.name);
  log(`Cloning ${chalk.green(details.repoPath)} to ${chalk.green(relativePath)}`);
  const proc = Bun.spawn(['git', 'clone', details.gitUrl, relativePath, '--depth=1'], {
    cwd: docsViewerRoot,
  });
  await proc.exited;
}

async function main() {
  log('Setting up the docs viewer');
  log(`\tCurrent working directory: ${chalk.green(process.cwd())}`);

  // clone repos
  await getOrUpdateRepo(EMBER_API_DOCS_DATA_REPO);
  await getOrUpdateRepo(EMBER_JSONAPI_DOCS_REPO);
  await getOrUpdateRepo(EMBER_API_DOCS_REPO);

  // symlink our own project root into projects as 'ember-data'
  const emberDataLocation = path.join(docsViewerRoot, './projects/ember-data');
  if (!fs.existsSync(emberDataLocation)) {
    log(`Symlinking ${chalk.green('ember-data')} to ${chalk.green('./projects/ember-data')}`);
    fs.symlinkSync(workspaceRoot, emberDataLocation);
  }

  // symlink `ember-api-docs-data` to `ember-api-docs`
  const projectRoot = path.join(docsViewerRoot, './projects');
  const emberApiDocsData = path.join(projectRoot, 'ember-api-docs-data');
  const symLinkLocation = path.join(projectRoot, 'ember-api-docs/ember-api-docs-data');

  if (!fs.existsSync(symLinkLocation)) {
    log(`Symlinking ${chalk.green('ember-api-docs-data')} to ${chalk.green('ember-api-docs')}`);
    fs.symlinkSync(emberApiDocsData, symLinkLocation);
  }

  log('Docs viewer setup complete');

  log('Generating the current docs in ember-jsonapi-docs (these will be inserted into ember-api-docs-data)');
  const currentVersion = require(path.join(workspaceRoot, 'package.json')).version;
  const absoluteVersion = currentVersion.split('-')[0];
  const command = ['bun', 'gen', '--project', 'ember-data', '--version', absoluteVersion];

  const proc = Bun.spawn(command, {
    cwd: path.join(projectRoot, 'ember-jsonapi-docs'),
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  await proc.exited;

  log('Docs generated. Run `bun regenerate-docs` to update the docs with any changes');
  log('Starting the docs viewer');

  const proc2 = Bun.spawn(['pnpm', 'start'], {
    cwd: path.join(projectRoot, 'ember-api-docs'),
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  await proc2.exited;
}

main();
