import vue from '@vitejs/plugin-vue';
import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['vue'];
export const entryPoints = ['./src/index.ts', './src/install.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
    plugins: [vue()],
  },
  import.meta.resolve
);
