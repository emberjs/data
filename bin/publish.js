#!/usr/bin/env node

'use strict';
/* eslint-disable node/no-unsupported-features/es-syntax, no-console, no-process-exit, node/no-extraneous-require, node/no-unpublished-require */

/*
Usage

publish lts|release|beta|canary

Flags

--distTag=latest|lts|beta|canary|release-<major>-<minor>
--bumpMajor
--bumpMinor
--skipVersion
--skipPack
--skipPublish 
--skipSmokeTest

Inspiration from https://github.com/glimmerjs/glimmer-vm/commit/01e68d7dddf28ac3200f183bffb7d520a3c71249#diff-19fef6f3236e72e3b5af7c884eef67a0
*/

const debug = require('debug')('publish-packages');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { shellSync } = require('execa');
const cliArgs = require('command-line-args');
const readline = require('readline');
const semver = require('semver');
const projectRoot = path.resolve(__dirname, '../');
const packagesDir = path.join(projectRoot, './packages');
const packages = fs.readdirSync(packagesDir);

function cleanProject() {
  execWithLog(
    `cd ${projectRoot} && rm -rf packages/*/dist packages/*/tmp packages/*/node_modules node_modules`
  );
  execWithLog(`cd ${projectRoot} && yarn install`);
}

/**
 *
 * @param {*} command The command to execute
 * @param {*} proxyIO whether to proxy stdio from the main process for this command
 *
 * proxyIO=true is useful when you want to see the output log or respond to prompts
 */
function execWithLog(command, proxyIO = false) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  if (proxyIO) {
    return shellSync(command, { stdio: [0, 1, 2] });
  }

  return shellSync(command).stdout;
}

function getConfig() {
  const mainOptionsDefinitions = [{ name: 'channel', defaultOption: true }];
  const mainOptions = cliArgs(mainOptionsDefinitions, { stopAtFirstUnknown: true });
  const argv = mainOptions._unknown || [];

  if (!mainOptions.channel) {
    throw new Error(`Incorrect usage of publish:\n\tpublish <channel>\n\nNo channel was specified`);
  }
  if (!['release', 'beta', 'canary', 'lts'].includes(mainOptions.channel)) {
    throw new Error(
      `Incorrect usage of publish:\n\tpublish <channel>\n\nChannel must be one of release|beta|canary|lts. Received ${mainOptions.channel}`
    );
  }

  const optionsDefinitions = [
    {
      name: 'distTag',
      alias: 't',
      type: String,
      defaultValue: mainOptions.channel === 'release' ? 'latest' : mainOptions.channel,
    },
    { name: 'skipVersion', type: Boolean, defaultValue: false },
    { name: 'skipPack', type: Boolean, defaultValue: false },
    { name: 'skipPublish', type: Boolean, defaultValue: false },
    { name: 'skipSmokeTest', type: Boolean, defaultValue: false },
    { name: 'bumpMajor', type: Boolean, defaultValue: false },
    { name: 'bumpMinor', type: Boolean, defaultValue: false },
    { name: 'force', type: Boolean, defaultValue: false },
  ];
  const options = cliArgs(optionsDefinitions, { argv });
  const currentProjectVersion = require(path.join(__dirname, '../lerna.json')).version;

  if (options.bumpMinor && options.bumpMajor) {
    throw new Error(`Cannot bump both major and minor versions simultaneously`);
  }

  options.channel = mainOptions.channel;
  options.currentVersion = currentProjectVersion;

  return options;
}

const options = getConfig();

function assertGitIsClean() {
  let status = execWithLog('git status');

  if (!status.match(/^nothing to commit/m)) {
    if (options.force) {
      console.log(
        chalk.white('⚠️ ⚠️ ⚠️  Local Git branch has uncommitted changes!\n\t') +
          chalk.yellow('Passed option: ') +
          chalk.white('--force') +
          chalk.grey(' :: ignoring unclean git working tree')
      );
    } else {
      console.log(
        chalk.red('💥 Git working tree is not clean. 💥 \n\t') +
          chalk.grey('Use ') +
          chalk.white('--force') +
          chalk.grey(' to ignore this warning and publish anyway\n') +
          chalk.yellow(
            '⚠️  Publishing from an unclean working state may result in a broken release ⚠️'
          )
      );
      process.exit(1);
    }
  }

  if (!status.match(/^Your branch is up to date with/m)) {
    if (options.force) {
      console.log(
        chalk.white('⚠️ ⚠️ ⚠️  Local Git branch is not in sync with origin branch') +
          chalk.yellow('\n\tPassed option: ') +
          chalk.white('--force') +
          chalk.grey(' :: ignoring unsynced git branch')
      );
    } else {
      console.log(
        chalk.red('💥 Local Git branch is not in sync with origin branch. 💥 \n\t') +
          chalk.grey('Use ') +
          chalk.white('--force') +
          chalk.grey(' to ignore this warning and publish anyway\n') +
          chalk.yellow(
            '⚠️  Publishing from an unsynced working state may result in a broken release ⚠️'
          )
      );
      process.exit(1);
    }
  }

  let expectedChannelBranch = options.distTag === 'canary' ? 'master' : options.distTag;

  if (options.channel === 'lts') {
    expectedChannelBranch = `lts-${semver.major(options.currentVersion)}-${semver.minor(
      options.currentVersion
    )}`;
  }

  let foundBranch = status.split('\n')[0];
  foundBranch = foundBranch.replace('On branch ', '');

  if (foundBranch !== expectedChannelBranch) {
    if (options.force) {
      console.log(
        chalk.white(
          `⚠️ ⚠️ ⚠️  Expected to publish npm tag ${options.distTag} from the git branch ${expectedChannelBranch}, but found ${foundBranch}`
        ) +
          chalk.yellow('\n\tPassed option: ') +
          chalk.white('--force') +
          chalk.grey(' :: ignoring unexpected branch')
      );
    } else {
      console.log(
        chalk.red(
          `💥 Expected to publish npm tag ${options.distTag} from the git branch ${expectedChannelBranch}, but found ${foundBranch} 💥 \n\t`
        ) +
          chalk.grey('Use ') +
          chalk.white('--force') +
          chalk.grey(' to ignore this warning and publish anyway\n') +
          chalk.yellow('⚠️  Publishing from an incorrect branch may result in a broken release ⚠️')
      );
      process.exit(1);
    }
  }
}

function retrieveNextVersion() {
  /* 

  A brief rundown of how version updates flow through the branches.
  
  - We only ever bump the major or minor version on master
  - All other branches pick it up as those changes flow through the release cycle.

  See RELEASE.md for more about this

  #master lerna.json 3.11.0-canary.x
    releases with `canary`
  #beta lerna.json 3.10.0-beta.x
    cuts from last 3.10.0-canary.x master with `beta`
  #release lerna.json 3.9.0
    cuts from last 3.9.0-beta.x
  #lts lerna.json 3.8.x
     cuts from last 3.8.x on release
*/
  let v;
  if (options.channel === 'release' || options.channel === 'lts') {
    // a new patch, or our first release of a new minor/major
    // for new minor/major the version will have drifted up
    // from prior beta/canary incrementing
    v = semver.inc(options.currentVersion, 'patch');
  } else if (options.channel === 'beta') {
    v = semver.inc(options.currentVersion, 'prerelease', 'beta');
  } else if (options.channel === 'canary') {
    if (options.bumpMajor === true) {
      // our first canary for an upcoming major
      v = semver.inc(options.currentVersion, 'major');
      v = semver.inc(v, 'prerelease', 'canary');
    } else if (options.bumpMinor === true) {
      // our first canary for an upcoming minor
      v = semver.inc(options.currentVersion, 'minor');
      v = semver.inc(v, 'prerelease', 'canary');
    } else {
      // a new nightly canary
      v = semver.inc(options.currentVersion, 'prerelease', 'canary');
    }
  }

  return v;
}

function convertPackageNameToTarballName(str) {
  str = str.replace('@', '');
  str = str.replace('/', '-');
  return str;
}

function collectTarballPaths() {
  const tarballs = [];
  packages.forEach(localName => {
    const pkgDir = path.join(packagesDir, localName);
    const pkgPath = path.join(pkgDir, 'package.json');
    const pkgInfo = require(pkgPath);
    if (pkgInfo.private !== true) {
      const tarballName = `${convertPackageNameToTarballName(pkgInfo.name)}-${pkgInfo.version}.tgz`;
      tarballs.push(path.join(projectRoot, tarballName));
    }
  });
  return tarballs;
}

function packAllPackages() {
  packages.forEach(localName => {
    const pkgDir = path.join(packagesDir, localName);
    const pkgPath = path.join(pkgDir, 'package.json');
    const pkgInfo = require(pkgPath);
    if (pkgInfo.private !== true) {
      // will pack into the project root directory
      execWithLog(`npm pack ${pkgDir}`);
    }
  });
}

async function getOTPToken() {
  let token = await question(chalk.green('\nPlease provide OTP token '));

  return token.trim();
}
function question(prompt) {
  return new Promise(resolve => {
    cli.question(prompt, resolve);
  });
}
let cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function publishPackage(distTag, otp, tarball) {
  execWithLog(`npm publish ${tarball} --tag=${distTag} --access=public --otp=${otp}`);
}

async function confirmPublish(tarballs, nextVersion) {
  let otp = await getOTPToken();

  for (let tarball of tarballs) {
    try {
      publishPackage(options.distTag, otp, tarball);
    } catch (e) {
      // the token is outdated, we need another one
      if (e.message.includes('E401') || e.message.includes('EOTP')) {
        otp = await getOTPToken();

        publishPackage(options.distTag, otp, tarball);
      } else {
        throw e;
      }
    }
  }
}

async function main() {
  assertGitIsClean();
  if (!options.skipSmokeTest) {
    execWithLog(`yarn run lint:js && yarn run test`, debug.enabled);
    console.log(`✅ ` + chalk.cyan(`Project passes Smoke Test`));
  } else {
    console.log(`⚠️ ` + chalk.grey(`Skipping Smoke Test`));
  }
  let nextVersion = options.currentVersion;
  if (!options.skipVersion) {
    nextVersion = retrieveNextVersion();
    execWithLog(`lerna version ${nextVersion}`, true);
    console.log(`✅ ` + chalk.cyan(`Successfully Versioned ${nextVersion}`));
  } else {
    console.log('⚠️ ' + chalk.grey(`Skipping Versioning`));
  }
  if (!options.skipPack) {
    cleanProject();
    packAllPackages();
    console.log(`✅ ` + chalk.cyan(`Successfully Packaged ${nextVersion}`));
  } else {
    console.log('⚠️ ' + chalk.grey(`Skipping Packaging`));
  }
  if (!options.skipPublish) {
    const tarballs = collectTarballPaths();
    await confirmPublish(tarballs, nextVersion);
    console.log(`✅ ` + chalk.cyan(`Successfully Published ${nextVersion}`));
  } else {
    console.log('⚠️ ' + chalk.grey(`Skipping Publishing`));
  }
}

main()
  .finally(() => cli.close())
  .catch(reason => {
    console.error(reason);
    process.exit(1);
  });
