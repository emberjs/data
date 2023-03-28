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
    '@glimmer/tracking',

    '@ember-data/legacy-compat/-private',
    '@ember-data/tracking/-private',
    '@ember-data/private-build-infra/current-deprecations',
    '@ember/-internals/glimmer',
    '@ember/-internals/metal',
    '@glimmer/validator',

    // to eliminate
    '@ember/object/compat',
    '@ember/runloop',
    '@ember/string',
    'ember',

    // investigate why these are present
    '@ember/application',
    '@ember/object/computed',

    // deprecated usages only
    '@ember/object',
    '@ember/object/proxy',
    '@ember/object/promise-proxy-mixin',
    '@ember/array/proxy',

    // test/debug only
    '@ember/test',
    '@ember/debug',
  ],

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', '-private.js']),

    nodeResolve({ extensions: ['.ts', '.js'] }),
    babel({
      extensions: ['.ts', '.js'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
