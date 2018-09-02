'use strict';
/* eslint-disable no-console, node/no-extraneous-require, node/no-unpublished-require */
const fs = require('fs');
const path = require('path');
const { shellSync } = require('execa');
// apparently violates no-extraneous require? /shrug
const debug = require('debug')('test-external');
const rimraf = require('rimraf');

const projectRoot = path.resolve(__dirname, '../../');
const externalProjectName = process.argv[2];
const gitUrl = process.argv[3];
const tempDir = path.join(projectRoot, '../__external-test-cache');
const projectTempDir = path.join(tempDir, externalProjectName);

if (!gitUrl) {
  throw new Error(
    'No git url provided to `node ./lib/scripts/test-external`. An https git url should be the first argument.'
  );
} else if (gitUrl.indexOf('https') !== 0) {
  throw new Error(
    `The git url provided to \`node ./lib/scripts/test-external\` should use https. Received '${gitUrl}'`
  );
}

console.log(
  `Preparing to test external project ${externalProjectName} located at ${gitUrl} against this ember-data commit.`
);

function execWithLog(command, force) {
  if (debug.enabled || force) {
    return shellSync(command, { stdio: [0, 1, 2] });
  }

  return shellSync(command);
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

if (fs.existsSync(projectTempDir)) {
  rimraf.sync(projectTempDir);
}

// install the project
try {
  execWithLog(
    `cd ../__external-test-cache && git clone --depth=1 ${gitUrl} ./${externalProjectName}`
  );
} catch (e) {
  debug(e);
  throw new Error(
    `Install of ${gitUrl} for external project ${externalProjectName} testing failed.`
  );
}

const useYarn = fs.existsSync(path.join(projectTempDir, 'yarn.lock'));
const useBower = fs.existsSync(path.join(projectTempDir, 'bower.json'));

// install project dependencies and link our local version of ember-data
try {
  execWithLog(
    `${
      useYarn ? 'yarn link' : 'npm link'
    } && cd ../__external-test-cache/${externalProjectName} && ${useYarn ? 'yarn' : 'npm install'}${
      useBower ? ' && bower install' : ''
    }`
  );
} catch (e) {
  debug(e);
  throw new Error(
    `Unable to complete install of dependencies for external project ${externalProjectName}`
  );
}

// run project tests
console.log(`Running tests for ${externalProjectName}`);

let smokeTestPassed = true;
let commitTestPassed = true;

try {
  debug('Running Smoke Test');
  execWithLog(`cd ../__external-test-cache/${externalProjectName} && ember test`, true);
} catch (e) {
  smokeTestPassed = false;
}

try {
  execWithLog(`${useYarn ? 'yarn link ember-data' : 'npm link ember-data'}`);
} catch (e) {
  debug(e);
  throw new Error(
    `Unable to \`${useYarn ? 'yarn' : 'npm'} link ember-data\` for ${externalProjectName}`
  );
}

try {
  debug('Re-running tests against EmberData commit');
  execWithLog(`cd ../__external-test-cache/${externalProjectName} && ember test`, true);
} catch (e) {
  commitTestPassed = false;
}

if (!smokeTestPassed && !commitTestPassed) {
  throw new Error(
    `Commit may result in a regression, but the smoke test for ${externalProjectName} also failed.`
  );
} else if (smokeTestPassed && !commitTestPassed) {
  throw new Error(`Commit results in a regression in ${externalProjectName}`);
} else if (!smokeTestPassed) {
  console.log(`Commit may resolve issues present in the smoke test for ${externalProjectName}`);
} else {
  console.log(`Commit does not regress ${externalProjectName}`);
}
