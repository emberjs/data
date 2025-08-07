import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['react'];
export const entryPoints = ['./src/index.ts', './src/install.ts'];

export default createConfig(
  {
    esbuild: true,
    entryPoints,
    externals,
    plugins: [],
  },
  import.meta.resolve
);
