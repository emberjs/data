/* eslint-disable node/no-unpublished-require */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const terserSettings = {
    enabled: true,
    exclude: ['assets/main-test-app.js', 'assets/tests.js', 'assets/test-support.js'],

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

  let config = {
    compatWith: '99',
    debug: {},
    features: {},
    deprecations: {},
  };
  let app = new EmberApp(defaults, {
    emberData: config,
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [...require('@ember-data/private-build-infra/src/debug-macros')(config)],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      includeExternalHelpers: true,
    },
    fingerprint: {
      enabled: false,
    },
    'ember-cli-terser': terserSettings,
    '@embroider/macros': {
      setConfig: {
        '@ember-data/store': {
          polyfillUUID: false,
        },
      },
    },
    sourcemaps: {
      enabled: false,
    },
  });

  return app.toTree();
};
