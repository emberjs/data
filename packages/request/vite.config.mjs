import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@ember/test-waiters'];
export const entryPoints = ['src/index.ts', 'src/fetch.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
