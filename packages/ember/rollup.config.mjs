import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

import { external } from '@warp-drive/internal-config/rollup/external.js';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: external([
    '@ember/template-compilation',
    '@ember/debug',
    '@ember/component', // unsure where this comes from
    '@ember/service',
    '@embroider/macros',
    '@glimmer/component',
    '@ember/test-waiters',
    '@glimmer/tracking',
  ]),

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js']),

    nodeResolve({ extensions: ['.ts', '.gts'] }),
    babel({
      extensions: ['.ts', '.gts'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Ensure that .gjs files are properly integrated as Javascript
    addon.gjs(),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
