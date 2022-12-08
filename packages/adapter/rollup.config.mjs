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
    '@ember/service',
    'require',
    'rsvp',
    'ember-inflector',
    '@ember/debug',
    '@ember/string',
    '@ember/object',
    '@ember/error',
    '@ember/object/mixin',
    '@ember/application',
    '@glimmer/env',
    '@ember/runloop',
    '@ember/polyfills',
  ],

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', 'error.js', 'json-api.js', 'rest.js', '-private.js']),

    nodeResolve({ extensions: ['.ts', '.js'] }),
    babel({
      extensions: ['.ts', '.js'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
