import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@ember/debug', '@ember/application'];
export const entryPoints = ['src/index.ts', 'src/builders.ts', 'src/-private.ts', 'src/utils.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
