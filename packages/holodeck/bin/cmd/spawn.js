/* eslint-disable no-console */
/* global Bun, globalThis */
const isBun = typeof Bun !== 'undefined';

export async function spawn(args, options) {
  if (isBun) {
    const proc = Bun.spawn(args, {
      env: process.env,
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    });
    await proc.exited;
    if (proc.exitCode !== 0) {
     throw proc.exitCode;
    }
    return;
  }

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

  await pSpawn(args.shift(), args, {
    stdio: 'inherit',
    shell: true,
  });
}
