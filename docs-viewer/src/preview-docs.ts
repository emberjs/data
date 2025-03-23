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
  installDeps,
  log,
  maybeMakePNPMInstallable,
  projectRoot,
  repoDetails,
  workspaceRoot,
} from './-utils.ts';

const EMBER_API_DOCS_REPO = `git@github.com:ember-learn/ember-api-docs.git`;
const EMBER_JSONAPI_DOCS_REPO = `git@github.com:ember-learn/ember-jsonapi-docs.git`;
const EMBER_API_DOCS_DATA_REPO = `git@github.com:ember-learn/ember-api-docs-data.git`;

async function getOrUpdateRepo(gitUrl: string) {
  const details = repoDetails(gitUrl);

  let updated = true;
  if (fs.existsSync(details.location)) {
    updated = await getLatest(details);
  } else {
    await cloneRepo(details);
  }

  if (!updated) {
    return;
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
  await installDeps(packageManager, details);
}

async function getSHA(details: ReturnType<typeof repoDetails>, reference: string) {
  log(`Getting commit sha for ${reference} for ${chalk.green(details.repoPath)}`);
  const shaProc1 = Bun.spawn(['git', 'rev-parse', reference], {
    cwd: details.location,
  });
  await shaProc1.exited;
  return (await new Response(shaProc1.stdout).text()).trim();
}

/**
 * Updates the repo by fetching only the latest commit on the main branch
 * and resetting the local repo to that commit
 *
 * Returns true if the repo was updated, false if it was already up to date
 */
async function getLatest(details: ReturnType<typeof repoDetails>): Promise<boolean> {
  const currentSha = await getSHA(details, 'HEAD^1');

  log(`Updating ${chalk.green(details.repoPath)} in ${chalk.green(details.installPathFromRoot)} to latest`);
  const mainBranch = details.name === 'ember-jsonapi-docs' ? 'master' : 'main';
  const proc = Bun.spawn(['git', 'fetch', 'origin', mainBranch, '--depth=1'], {
    cwd: details.location,
  });
  await proc.exited;

  // if the commit sha has not changed, we do not need to reset
  const newSha = await getSHA(details, `origin/${mainBranch}`);

  if (currentSha === newSha) {
    log(`${chalk.green(details.repoPath)} is already up to date`);
    return false;
  } else {
    log(`Resetting ${chalk.green(details.repoPath)} from ${chalk.red(currentSha)} to ${chalk.green(newSha)}`);
  }

  const proc2 = Bun.spawn(['git', 'reset', '--hard', `origin/${mainBranch}`], {
    cwd: details.location,
  });
  await proc2.exited;

  return true;
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
  const exitCode = await proc.exited;

  // if the clone fails for publicKey we try https
  if (exitCode !== 0) {
    const reason = await new Response(proc.stderr).text();
    if (reason.includes('publickey')) {
      log(`Cloning ${chalk.green(details.repoPath)} to ${chalk.green(relativePath)} using https`);
      const proc2 = Bun.spawn(['git', 'clone', details.httpsUrl, relativePath, '--depth=1'], {
        cwd: docsViewerRoot,
      });
      await proc2.exited;
    } else {
      throw new Error(reason);
    }
  }
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

  // symlink our own project root into projects as 'data'
  /////////////////////////////////////////////////////////////
  //
  const emberDataLocation = path.join(projectRoot, 'data');
  if (!fs.existsSync(emberDataLocation)) {
    log(`Symlinking ${chalk.green('ember-data')} to ${chalk.green('./projects/data')}`);
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
  if (process.env.CI) {
    log('CI environment detected, skipping docs viewer start, building instead');
    const proc2 = Bun.spawn(['pnpm', 'build'], {
      cwd: path.join(projectRoot, 'ember-api-docs'),
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    await proc2.exited;
  } else {
    const proc2 = Bun.spawn(['pnpm', 'start'], {
      cwd: path.join(projectRoot, 'ember-api-docs'),
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    await proc2.exited;
  }
}

main();
