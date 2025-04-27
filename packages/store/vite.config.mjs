import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@ember/runloop', '@ember/object', '@ember/debug'];
export const entryPoints = ['./src/index.ts', './src/types.ts', './src/-private.ts', './src/configure.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
