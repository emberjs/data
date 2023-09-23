#!/bin/sh -
':'; /*-
test1=$(bun --version 2>&1) && exec bun "$0" "$@"
test2=$(node --version 2>&1) && exec node "$0" "$@"
exec printf '%s\n' "$test1" "$test2" 1>&2
*/
/* eslint-disable no-console */
/* global Bun, globalThis */

import chalk from 'chalk';

const isBun = typeof Bun !== 'undefined';
const { process } = globalThis;

console.log(
  chalk.grey(
    `\nWrapping Command With Mock Server\n=================================\n\tRunning With: ${chalk.green(
      isBun ? 'bun' : 'node'
    )}`
  )
);

if (isBun) {
  const args = Bun.argv.slice(2);
  const proc = Bun.spawn(['bun', 'run', 'mock-server:start']);
  await proc.exited;

  const proc2 = Bun.spawn(['bun', 'run', ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await proc2.exited;

  const proc3 = Bun.spawn(['bun', 'run', 'mock-server:stop']);
  await proc3.exited;
  process.exit(proc2.exitCode);
} else {
  const args = process.argv.slice(2);
  const { spawn } = await import('node:child_process');

  // eslint-disable-next-line no-inner-declarations
  function pSpawn(cmd, args, opts) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, opts);
      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(code);
        }
      });
    });
  }

  await pSpawn('pnpm', ['run', 'mock-server:start'], {
    stdio: 'inherit',
  });

  let exitCode = 0;
  try {
    await pSpawn('pnpm', ['run', ...args], {
      stdio: 'inherit',
    });
  } catch (e) {
    exitCode = e;
  }
  await pSpawn('pnpm', ['run', 'mock-server:stop'], {
    stdio: 'inherit',
  });
  process.exit(exitCode);
}
