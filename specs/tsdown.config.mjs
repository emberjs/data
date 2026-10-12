import { createConfig } from '@warp-drive/internal-config/tsdown/config.js';

export const externals = [];

export const entryPoints = ['./src/*.spec.ts', './src/request-recovery.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
