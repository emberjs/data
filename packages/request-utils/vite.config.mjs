import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['@ember/debug'];
export const entryPoints = ['src/index.ts', 'src/string.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
