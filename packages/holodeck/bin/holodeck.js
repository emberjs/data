#!/bin/sh -
':'; /*-
test1=$(bun --version 2>&1) && exec bun "$0" "$@"
test2=$(node --version 2>&1) && exec node "$0" "$@"
exec printf '%s\n' "$test1" "$test2" 1>&2
*/
/* eslint-disable no-console */
/* global Bun, globalThis */

import chalk from 'chalk';
import { spawn } from './cmd/spawn.js';

const isBun = typeof Bun !== 'undefined';
const { process } = globalThis;

const args = isBun ? Bun.argv.slice(2) : process.argv.slice(2);
const command = args.shift();

const BUN_SUPPORTS_PM2 = false;
const BUN_SUPPORTS_HTTP2 = false;

if (command === 'run') {
  console.log(
    chalk.grey(
      `\n\t@${chalk.greenBright('warp-drive')}/${chalk.magentaBright(
        'holodeck'
      )} 🌅\n\t=================================}\n`
    ) +
      chalk.grey(
        `\n\tHolodeck Access Granted\n\t\tprogram: ${chalk.green(args.join(' '))}\n\t\tengine: ${chalk.cyan(
          isBun ? 'bun@' + Bun.version : 'node'
        )}`
      )
  );
  const run = await import('./cmd/run.js');
  await run.default(args);
} else if (command === 'start') {
  console.log(chalk.grey(`\n\tStarting Subroutines (mode:${chalk.cyan(isBun ? 'bun' : 'node')})`));

  if (!isBun || (BUN_SUPPORTS_HTTP2 && BUN_SUPPORTS_PM2)) {
    const pm2 = await import('./cmd/pm2.js');
    await pm2.default('start', args);
  } else {
    console.log(`Downgrading to node to run pm2 due lack of http/2 or pm2 support in Bun`);
    const __dirname = import.meta.dir;
    const programPath = __dirname + '/cmd/_start.js';
    await spawn(['node', programPath, ...args]);
  }
} else if (command === 'end') {
  console.log(chalk.grey(`\n\tEnding Subroutines (mode:${chalk.cyan(isBun ? 'bun' : 'node')})`));

  if (!isBun || (BUN_SUPPORTS_HTTP2 && BUN_SUPPORTS_PM2)) {
    const pm2 = await import('./cmd/pm2.js');
    await pm2.default('stop', args);
  } else {
    console.log(`Downgrading to node to run pm2 due lack of http/2 or pm2 support in Bun`);
    const __dirname = import.meta.dir;
    const programPath = __dirname + '/cmd/_stop.js';
    await spawn(['node', programPath, ...args]);
  }

  console.log(`\n\t${chalk.grey('The Computer has ended the program')}\n`);
}
