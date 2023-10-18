import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: ["@ember/test-helpers/index.js", "ember-cli-test-loader/test-support/index.js"],

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', 'reporters/dom.js', 'reporters/tap.js', 'runners/dom.js', 'ember.js']),

    nodeResolve({ extensions: ['.ts'] }),
    babel({
      extensions: ['.ts'],
      babelHelpers: 'bundled',
    }),

    addon.keepAssets(['**/*.css']),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
