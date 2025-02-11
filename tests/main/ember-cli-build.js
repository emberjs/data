'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config');
  const { macros } = await import('@warp-drive/build-config/babel-macros');

  const isTest = process.env.EMBER_CLI_TEST_COMMAND;
  const isProd = process.env.EMBER_ENV === 'production';

  const terserSettings = {
    exclude: ['assets/main-test-app.js', 'assets/tests.js', 'assets/test-support.js'],

    terser: {
      compress: {
        ecma: 2022,
        passes: 6, // slow, but worth it
        negate_iife: false,
        sequences: 30,
        defaults: true,
        arguments: false,
        keep_fargs: false,
        toplevel: false,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_proto: true,
        unsafe_undefined: true,
      },
      toplevel: false,
      sourceMap: false,
      ecma: 2022,
    },
  };

  if (isTest && isProd) {
    terserSettings.enabled = false;
  }

  const app = new EmberApp(defaults, {
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [...macros()],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      enableTypeScriptTransform: true,
    },
    'ember-cli-terser': terserSettings,
    sourcemaps: {
      enabled: false,
    },
  });

  setConfig(app, __dirname, {
    compatWith: process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null,
    deprecations: {
      DISABLE_6X_DEPRECATIONS: false,
    },
  });

  return app.toTree();
};
