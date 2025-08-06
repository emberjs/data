import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];
export const entryPoints = ['./src/install.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
    plugins: [],
    useGlint: true,
  },
  import.meta.resolve
);
