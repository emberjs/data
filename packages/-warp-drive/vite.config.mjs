import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['node:child_process', 'fs', 'chalk', 'path', 'semver', 'comment-json'];
export const entryPoints = ['./src/warp-drive.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
