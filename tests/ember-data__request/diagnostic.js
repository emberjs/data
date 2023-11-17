/* global Bun */
import launch from '@warp-drive/diagnostic/server/default-setup.js';

/** @type {import('bun-types')} */

await launch({
  async setup() {
    Bun.spawnSync(['holodeck', 'start'], {
      env: process.env,
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    });
  },
  async cleanup() {
    Bun.spawnSync(['holodeck', 'end'], {
      env: process.env,
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    });
  },
});
