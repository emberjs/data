import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = [];

export const entryPoints = ['./src/*.spec.ts'];

const viteConfig = createConfig(
  {
    entryPoints,
    externals,
  },
  import.meta.resolve
);

export default viteConfig;
