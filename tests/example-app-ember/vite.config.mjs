import { defineConfig } from 'vite';
import { extensions, ember, hbs } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:4701',
    },
  },
  resolve: {
    alias: {
      '@html-next/vertical-collection':
        process.cwd() + '/node_modules/' + '@html-next/vertical-collection/addon/components/vertical-collection.js',
    },
  },
  plugins: [
    hbs(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
