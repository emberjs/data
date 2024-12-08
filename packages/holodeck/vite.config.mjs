import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];
export const entryPoints = ['./client/index.ts'];

export default createConfig(
  {
    srcDir: './client',
    entryPoints,
    externals,
    fixModule: false,
  },
  import.meta.resolve
);
