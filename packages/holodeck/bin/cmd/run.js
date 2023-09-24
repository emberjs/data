/* eslint-disable no-console */
/* global Bun, globalThis */
const isBun = typeof Bun !== 'undefined';
const { process } = globalThis;
import { spawn } from './spawn.js';

export default async function run(args) {
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
      await spawn(['pnpm', 'exec', ...args]);
    } catch (e) {
      exitCode = e;
    }
    await spawn(['pnpm', 'run', 'holodeck:end-program']);
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
}
