'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config');
  const { macros } = await import('@warp-drive/build-config/babel-macros');
  const plugins = macros();

  const app = new EmberApp(defaults, {
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins,
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      enableTypeScriptTransform: true,
    },
  });

  setConfig(app, __dirname, {
    compatWith: process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null,
    deprecations: {
      DEPRECATE_CATCH_ALL: false,
    },
  });

  const { Webpack } = require('@embroider/webpack');
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
    compatAdapters: new Map([
      ['@ember-data/active-record', null],
      ['@ember-data/adapter', null],
      ['@ember-data/debug', null],
      ['@ember-data/graph', null],
      ['@ember-data/json-api', null],
      ['@ember-data/legacy-compat', null],
      ['@ember-data/model', null],
      ['@ember-data/record-data', null],
      ['@ember-data/request-utils', null],
      ['@ember-data/request', null],
      ['@ember-data/rest', null],
      ['@ember-data/serializer', null],
      ['@ember-data/store', null],
      ['ember-data', null],
    ]),
  });
};
