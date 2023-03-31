import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'addon',
});

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: [
    '@embroider/macros',
    '@ember-data/store/-private',
    '@ember/service',
    'ember-inflector',
    '@ember/debug',
    '@ember/string',
    '@ember/object',
    '@ember/object/mixin',
    '@ember/application',
    '@glimmer/env',
    '@ember/polyfills',
  ],

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['src/**/*.js', 'index.js']),

    addon.appReexports(['app/**/*.js']),
    nodeResolve({ extensions: ['.ts', '.js'] }),
    babel({
      extensions: ['.ts', '.js'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
