/* eslint-disable no-console */
/* global Bun, globalThis */
const isBun = typeof Bun !== 'undefined';
const { process } = globalThis;
import { spawn } from './spawn.js';
import fs from 'fs';

export default async function run(args) {
  const pkg = JSON.parse(fs.readFileSync('./package.json'), 'utf8');
  const cmd = args[0];
  const isPkgScript = args.length === 1 && pkg.scripts[cmd];

  if (isBun) {
    await spawn(['bun', 'run', 'holodeck:start-program']);

    let exitCode = 0;
    try {
      await spawn(['bun', 'run', ...args]);
    } catch (e) {
      exitCode = e;
    }
    await spawn(['bun', 'run', 'holodeck:end-program']);
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
    return;
  } else {
    await spawn(['pnpm', 'run', 'holodeck:start-program']);

    let exitCode = 0;
    try {
      if (isPkgScript) {
        const cmdArgs = pkg.scripts[cmd].split(' ');
        await spawn(cmdArgs);
      } else {
        await spawn(['pnpm', 'exec', ...args]);
      }
    } catch (e) {
      exitCode = e;
    }
    await spawn(['pnpm', 'run', 'holodeck:end-program']);
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
}
