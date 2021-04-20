'use strict';
/* eslint-disable node/no-unsupported-features/es-syntax */

const readline = require('readline');
const process = require('process');

const chalk = require('chalk');
const execa = require('execa');
const debug = require('debug')('publish-packages');

const determineNextAlpha = require('./next-alpha-util');

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
  console.log(determineNextAlpha(versions));
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
