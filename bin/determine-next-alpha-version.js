'use strict';
/* eslint-disable node/no-unsupported-features/es-syntax */

const readline = require('readline');
const process = require('process');

const chalk = require('chalk');
const execa = require('execa');
const semver = require('semver');
const debug = require('debug')('publish-packages');

function execWithLog(command) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  return execa.sync(command, { shell: true, preferLocal: true }).stdout;
}

async function main() {
  const versionsJSON = execWithLog('npm view ember-data versions --json');
  // [
  //   "3.25.0"
  //   "3.26.0-alpha.0",
  //   "3.26.0-beta.0"
  // ]
  const versions = JSON.parse(versionsJSON);
  let idx = versions.length - 1;
  let lastAlpha;
  let lastRelease;

  while (idx > -1) {
    const version = versions[idx];
    if (version.indexOf('-alpha.') > -1) {
      lastAlpha = version;
    } else if (version.split('.').length === 3) {
      lastRelease = version;
      break;
    }
    idx--;
  }

  if (lastRelease && !lastAlpha) {
    return console.log(semver.inc(lastRelease, 'preminor', 'alpha'));
  } else if (lastAlpha) {
    return console.log(semver.inc(lastAlpha, 'prerelease', 'alpha'));
  } else {
    throw Error('Could not determine next version because no recent release or alpha version');
  }
}

let cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

main()
  .finally(() => cli.close())
  .catch(reason => {
    console.error(reason);
    process.exit(1);
  });
