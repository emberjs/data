import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];

export const entryPoints = ['src/hooks.ts', 'src/record.ts', 'src/schema.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);
