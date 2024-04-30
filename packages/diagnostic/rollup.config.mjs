import { Addon } from '@embroider/addon-dev/rollup';
import ts from 'rollup-plugin-ts';
import babelConfig from './babel.config.mjs';

import { external } from '@warp-drive/internal-config/rollup/external.js';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: external(['@ember/runloop', '@ember/test-helpers', 'ember-cli-test-loader/test-support/index']),

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints([
      'index.js',
      'reporters/dom.js',
      'reporters/tap.js',
      'runners/dom.js',
      'ember.js',
      '-types.js',
    ]),

    ts({
      transpiler: 'babel',
      babelConfig,
      transpileOnly: true,
      browserslist: false,
    }),

    addon.keepAssets(['**/*.css']),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
