import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];
export const entryPoints = ['src/request.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
