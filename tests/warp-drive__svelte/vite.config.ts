import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import babel from 'vite-plugin-babel';

export default defineConfig({
  plugins: [
    sveltekit(),
    babel({
      filter: /\.js$/,
    }),
  ],

  test: {
    include: ['tests/**/*.{test,spec}.{js,ts}'],
  },
});
