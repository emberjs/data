import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

import { external } from '@warp-drive/internal-config/rollup/external.js';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'addon',
});

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: external([
    '@embroider/macros',
    '@ember/service',
    '@ember/debug',
    '@ember/object/computed',
    '@ember-data/store/-private',
    '@ember/object/internals',
    '@ember-data/tracking/-private',
    '@ember/object/promise-proxy-mixin',
    '@ember/object/proxy',
    '@ember/array',
    '@ember/array/proxy',
    '@ember/object',
    '@ember/object/mixin',
    '@ember/application',
    '@ember/polyfills',
    'expect-type',
  ]),

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', '-private.js', 'hooks.js', 'migration-support.js']),

    nodeResolve({ extensions: ['.ts', '.js'] }),
    babel({
      extensions: ['.ts', '.js'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
