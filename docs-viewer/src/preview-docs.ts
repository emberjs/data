#! /usr/bin/env bun
/**
 * Sets up the docs viewer app
 */
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import {
  determinePackageManager,
  docsViewerRoot,
  generateDocs,
  getCurrentVersion,
  log,
  maybeMakePNPMInstallable,
  projectRoot,
  repoDetails,
  workspaceRoot,
} from './-utils';

const EMBER_API_DOCS_REPO = `git@github.com:ember-learn/ember-api-docs.git`;
const EMBER_JSONAPI_DOCS_REPO = `git@github.com:ember-learn/ember-jsonapi-docs.git`;
const EMBER_API_DOCS_DATA_REPO = `git@github.com:ember-learn/ember-api-docs-data.git`;

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
    // some of the repositories use pnpm but do not have volta configured
    // and have not had their engines/packageManager field updated in a while.
    // this lets us still install them with pnpm if that is the case
    await maybeMakePNPMInstallable(details);
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

/**
 * Updates the repo by fetching only the latest commit on the main branch
 * and resetting the local repo to that commit
 */
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

/**
 * Clones the repo, fetching only the latest commit
 */
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
  //////////////
  //
  await getOrUpdateRepo(EMBER_API_DOCS_DATA_REPO);
  await getOrUpdateRepo(EMBER_JSONAPI_DOCS_REPO);
  await getOrUpdateRepo(EMBER_API_DOCS_REPO);

  // symlink our own project root into projects as 'ember-data'
  /////////////////////////////////////////////////////////////
  //
  const emberDataLocation = path.join(projectRoot, 'ember-data');
  if (!fs.existsSync(emberDataLocation)) {
    log(`Symlinking ${chalk.green('ember-data')} to ${chalk.green('./projects/ember-data')}`);
    fs.symlinkSync(workspaceRoot, emberDataLocation);
  }

  // symlink `ember-api-docs-data` into `ember-api-docs`
  ////////////////////////////////////////////////////
  //
  const emberApiDocsData = path.join(projectRoot, 'ember-api-docs-data');
  const symLinkLocation = path.join(projectRoot, 'ember-api-docs/ember-api-docs-data');
  if (!fs.existsSync(symLinkLocation)) {
    log(`Symlinking ${chalk.green('ember-api-docs-data')} to ${chalk.green('ember-api-docs')}`);
    fs.symlinkSync(emberApiDocsData, symLinkLocation);
  }

  log('Docs viewer setup complete');
  log('Generating the current docs in ember-jsonapi-docs (these will be inserted into ember-api-docs-data)');

  // generate the docs
  ////////////////////
  //
  await generateDocs();

  log('Docs generated. Run `bun regenerate-docs` to update the docs with any changes');
  log('Starting the docs viewer');

  // start the docs viewer
  ////////////////////////
  //
  const proc2 = Bun.spawn(['pnpm', 'start'], {
    cwd: path.join(projectRoot, 'ember-api-docs'),
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  await proc2.exited;
}

main();
