import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];
export const entryPoints = ['./src/index.ts', './src/mock.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
    fixModule: false,
  },
  import.meta.resolve
);
