import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export const externals = ['svelte'];
export const entryPoints = ['./src/lib/index.ts', './src/lin/install.svelte.ts'];

export default defineConfig({
  plugins: [sveltekit()],
});
