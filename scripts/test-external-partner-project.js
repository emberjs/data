'use strict';

const fs = require('fs');
const path = require('path');

const execa = require('execa');
// apparently violates no-extraneous require? /shrug
const debug = require('debug')('test-external');
const rimraf = require('rimraf');
const chalk = require('chalk');
const cliArgs = require('command-line-args');

const projectRoot = path.resolve(__dirname, '../');

let cliOptionsDef = [{ name: 'projectName', defaultOption: true }];
let cliOptions = cliArgs(cliOptionsDef, { stopAtFirstUnknown: true });
const externalProjectName = cliOptions.projectName;
let argv = cliOptions._unknown || [];
cliOptionsDef = [{ name: 'gitUrl', defaultOption: true }];
cliOptions = cliArgs(cliOptionsDef, { stopAtFirstUnknown: true, argv });
const gitUrl = cliOptions.gitUrl;
argv = cliOptions._unknown || [];
cliOptionsDef = [
  { name: 'skipSmokeTest', type: Boolean, defaultValue: false },
  { name: 'skipClone', type: Boolean, defaultValue: false },
  { name: 'skipTest', type: Boolean, defaultValue: false },
  { name: 'noLockFile', type: Boolean, defaultValue: false },
  { name: 'useCache', type: Boolean, defaultValue: false },
];
cliOptions = cliArgs(cliOptionsDef, { argv });

const { skipSmokeTest, skipClone, skipTest, noLockFile, useCache } = cliOptions;

// we share this for the build
const cachePath = '../__external-test-cache';
const tempDir = path.join(projectRoot, cachePath);
const projectTempDir = path.join(tempDir, externalProjectName);
const insertTarballsToPackageJson = require('./-tarball-info').insertTarballsToPackageJson;

if (!gitUrl) {
  throw new Error('No git url provided to `test-external-partner`. An https git url should be the first argument.');
} else if (gitUrl.indexOf('https') !== 0) {
  throw new Error(`The git url provided to \`node test-external-partner\` should use https. Received '${gitUrl}'`);
}

console.log(
  `Preparing to test external project ${externalProjectName} located at ${gitUrl} against this ember-data commit.`
);

function execExternal(command, force) {
  command = `cd ${projectTempDir} && ${command}`;
  return execWithLog(command, force);
}

function execWithLog(command, force) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  if (debug.enabled || force) {
    return execa.sync(command, { stdio: [0, 1, 2], shell: true });
  }

  return execa.sync(command, { shell: true }).stdout;
}

if (!fs.existsSync(tempDir)) {
  debug(`Ensuring Cache Root at: ${tempDir}`);
  fs.mkdirSync(tempDir);
} else {
  debug(`Cache Root Exists at: ${tempDir}`);
}

if (fs.existsSync(projectTempDir)) {
  if (!skipClone) {
    debug(`Cleaning Cache at: ${projectTempDir}`);
    rimraf.sync(projectTempDir);
  } else {
    debug(`Skipping Cache Clean at: ${projectTempDir}`);
  }
} else {
  debug(`No pre-existing cache present at: ${projectTempDir}`);
}

// install the project
try {
  if (!skipClone) {
    execWithLog(`git clone --depth=1 ${gitUrl} ${projectTempDir}`);
  } else {
    debug(`Skipping git clone`);
  }
} catch (e) {
  debug(e);
  throw new Error(
    `Install of ${gitUrl} in ${projectTempDir} for external project ${externalProjectName} testing failed.`
  );
}

const usePnpm = fs.existsSync(path.join(projectTempDir, 'yarn.lock'));
const packageJsonLocation = path.join(projectTempDir, 'package.json');

// run project tests
console.log(`Running tests for ${externalProjectName}`);

let smokeTestPassed = true;
let commitTestPassed = true;

try {
  if (skipSmokeTest) {
    debug('Skipping Smoke Test');
  } else {
    debug('Running Smoke Test');
    try {
      execExternal(`${usePnpm ? 'pnpm install' : 'npm install'}`);
    } catch (e) {
      debug(e);
      throw new Error(`Unable to complete install of dependencies for external project ${externalProjectName}`);
    }
    execExternal(`ember test`, true);
  }
} catch (e) {
  smokeTestPassed = false;
}

try {
  debug('Preparing Package To Run Tests Against Commit');
  insertTarballsToPackageJson(packageJsonLocation);

  // clear node_modules installed for the smoke-test
  execExternal(`rm -rf node_modules`);
  // we are forced to use pnpm so that our resolutions will be respected
  // in addition to the version file link we insert otherwise nested deps
  // may bring their own ember-data
  //
  // For this reason we don't trust the lock file
  // we also can't trust the cache
  execExternal(`pnpm install${noLockFile ? ' --no-lockfile' : ''}${useCache ? '' : ' --cache-folder=tmp/yarn-cache'}`);
} catch (e) {
  console.log(`Unable to npm install tarballs for ember-data\` for ${externalProjectName}. Original error below:`);

  throw e;
}

if (!skipTest) {
  try {
    debug('Running tests against EmberData commit');
    execExternal(`ember --version`, true);
    // ember-cli test command does not have --output-path available
    // in all versions of our partner test's
    execExternal(`ember build`, true);
    execExternal(`ember test --path="./dist"`, true);
  } catch (e) {
    commitTestPassed = false;
  }
}

if (skipTest) {
  console.log(`Skipped Tests: Commit viability unknown`);
} else {
  if (skipSmokeTest && !commitTestPassed) {
    throw new Error('Commit may result in a regression, but the smoke test was skipped.');
  } else if (!smokeTestPassed && !commitTestPassed) {
    throw new Error(`Commit may result in a regression, but the smoke test for ${externalProjectName} also failed.`);
  } else if (smokeTestPassed && !commitTestPassed) {
    throw new Error(`Commit results in a regression in ${externalProjectName}`);
  } else if (!smokeTestPassed) {
    console.log(`Commit may resolve issues present in the smoke test for ${externalProjectName}`);
  } else {
    console.log(`Commit does not regress ${externalProjectName}`);
  }
}
