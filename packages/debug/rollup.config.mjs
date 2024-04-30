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

  external: external([
    '@embroider/macros',
    '@ember-data/store/-private',
    '@ember/debug/data-adapter',
    '@ember/service',
    '@ember/object/observers',
    '@ember/string',
    '@ember/array',
    '@ember/debug', // assert, deprecate
  ]),

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', 'data-adapter.js']),

    ts({
      transpiler: 'babel',
      babelConfig,
      transpileOnly: true,
      browserslist: false,
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
