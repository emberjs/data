'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

function isEnabled(flag) {
  return flag === true || flag === 'true' || flag === '1';
}

function logSystem() {
  const args = process.argv.slice(2);
  const env = Object.assign({}, process.env);
  const known = [
    'WARP_DRIVE_FEATURE_OVERRIDE',
    'NODE_ENV',
    'CI',
    'EMBER_ENV',
    'IS_TESTING',
    'EMBER_CLI_TEST_COMMAND',
    'IS_RECORDING',
    'ASSERT_ALL_DEPRECATIONS',
    'EMBER_DATA_FULL_COMPAT',
    'HOLODECK_SSL_CERT_PATH',
    'HOLODECK_SSL_KEY_PATH',
  ];

  const knownEnv = {};
  const otherEnv = {};

  Object.keys(env).forEach((key) => {
    if (known.includes(key)) {
      knownEnv[key] = env[key];
    } else {
      otherEnv[key] = env[key];
    }
  });

  console.log({
    knownEnv,
    // otherEnv,
    args,
  });
}

module.exports = async function (defaults) {
  logSystem();
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
    compatWith: isEnabled(process.env.EMBER_DATA_FULL_COMPAT) ? '99.0' : null,
    deprecations: {
      DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: false,
      DEPRECATE_TRACKING_PACKAGE: false,
    },
    debug: {
      // LOG_GRAPH: true,
      // LOG_IDENTIFIERS: true,
      // LOG_NOTIFICATIONS: true,
      // LOG_INSTANCE_CACHE: true,
      // LOG_CACHE: true,
      // LOG_REQUESTS: true,
      // LOG_REQUEST_STATUS: true,
    },
  });

  return app.toTree();
};
