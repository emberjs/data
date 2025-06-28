import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createConfig } from '@warp-drive/internal-config/vite/config.js';

export const externals = ['svelte'];
export const entryPoints = ['./src/index.ts', './src/install.svelte.ts'];

export default createConfig(
  {
    entryPoints,
    externals,
    plugins: [svelte()],
  },
  import.meta.resolve
);
