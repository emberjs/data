import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@ember/debug', '@embroider/macros'];

export const entryPoints = ['./src/index.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
