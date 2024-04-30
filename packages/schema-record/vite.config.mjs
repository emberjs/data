import { resolve } from 'node:path';
import { babel } from '@rollup/plugin-babel';
import { external } from '@warp-drive/internal-config/rollup/external.js';
import url from 'node:url';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
//import { execaCommand } from 'execa';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  esbuild: false,
  build: {
    outDir: 'dist',
    // These targets are not "support".
    // A consuming app or library should compile further if they need to support
    // old browsers.
    target: ['esnext', 'firefox121'],
    // In case folks debug without sourcemaps
    //
    // TODO: do a dual build, split for development + production
    // where production is optimized for CDN loading via
    // https://limber.glimdown.com
    minify: false,
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: [
        resolve(__dirname, 'src/hooks.ts'),
        resolve(__dirname, 'src/record.ts'),
        resolve(__dirname, 'src/schema.ts'),
      ],
      name: '@warp-drive/schema-record',
      formats: ['es'],
      // the proper extensions will be added
      fileName: 'index',
    },
    rollupOptions: {
      external: external(['@embroider/macros', '@ember/debug']),
    },
  },
  plugins: [
    babel({
      babelHelpers: 'inline',
      extensions: ['.js', '.ts'],
    }),
    dts({
      // Incorrectly duplicates symbols when set to true
      rollupTypes: false,
      outDir: 'unstable-preview-types',
    }),
  ],
});
