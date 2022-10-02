'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function (defaults) {
  const isTest = process.env.EMBER_CLI_TEST_COMMAND;
  const isProd = process.env.EMBER_ENV === 'production';
  const compatWith = process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null;

  const terserSettings = {
    exclude: ['assets/dummy.js', 'assets/tests.js', 'assets/test-support.js', 'dist/docs/*', 'docs/*'],

    terser: {
      compress: {
        ecma: 2021,
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
      ecma: 2021,
    },
  };

  if (isTest && isProd) {
    terserSettings.enabled = false;
  }

  let config = {
    compatWith,
    debug: {
      LOG_PAYLOADS: process.env.DEBUG_DATA ? true : false,
      LOG_OPERATIONS: process.env.DEBUG_DATA ? true : false,
      LOG_MUTATIONS: process.env.DEBUG_DATA ? true : false,
      LOG_NOTIFICATIONS: process.env.DEBUG_DATA ? true : false,
      LOG_REQUEST_STATUS: process.env.DEBUG_DATA ? true : false,
      LOG_IDENTIFIERS: process.env.DEBUG_DATA ? true : false,
      LOG_GRAPH: process.env.DEBUG_DATA ? true : false,
      LOG_INSTANCE_CACHE: process.env.DEBUG_DATA ? true : false,
    },
  };
  let app = new EmberAddon(defaults, {
    emberData: config,
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [...require('@ember-data/private-build-infra/src/debug-macros')(null, isProd, config)],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      includeExternalHelpers: true,
    },
    'ember-cli-terser': terserSettings,
    '@embroider/macros': {
      setConfig: {
        '@ember-data/store': {
          polyfillUUID: true,
        },
      },
    },
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return app.toTree();
};
