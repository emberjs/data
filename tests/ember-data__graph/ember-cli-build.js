'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const compatWith = process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null;
  const isProd = process.env.EMBER_ENV === 'production';

  const config = {
    compatWith,
    includeDataAdapterInProduction: true,
    includeDataAdapter: true,
    debug: {
      LOG_PAYLOADS: process.env.DEBUG_DATA ? true : false,
      LOG_OPERATIONS: process.env.DEBUG_DATA ? true : false,
      LOG_MUTATIONS: process.env.DEBUG_DATA ? true : false,
      LOG_NOTIFICATIONS: process.env.DEBUG_DATA ? true : false,
      LOG_REQUESTS: process.env.DEBUG_DATA ? true : false,
      LOG_REQUEST_STATUS: process.env.DEBUG_DATA ? true : false,
      LOG_IDENTIFIERS: process.env.DEBUG_DATA ? true : false,
      LOG_GRAPH: process.env.DEBUG_DATA ? true : false,
      LOG_INSTANCE_CACHE: process.env.DEBUG_DATA ? true : false,
    },
    deprecations: require('@ember-data/private-build-infra/src/deprecations')(compatWith || null),
    features: require('@ember-data/private-build-infra/src/features')(isProd),
    env: require('@ember-data/private-build-infra/src/utilities/get-env')(),
  };

  const app = new EmberApp(defaults, {
    emberData: Object.assign({}, config),
    tests: true,
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [...require('@ember-data/private-build-infra/src/debug-macros')(config)],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      enableTypeScriptTransform: true,
    },
    '@embroider/macros': {
      // setConfig: {
      //   '@ember-data/store': {
      //     polyfillUUID: true,
      //   },
      // },
      setOwnConfig: config,
    },
  });

  app.import('node_modules/@warp-drive/diagnostic/dist/styles/dom-reporter.css');

  return app.toTree();
  // const { Webpack } = require('@embroider/webpack');

  // return require('@embroider/compat').compatBuild(app, Webpack, {
  //   // staticAddonTestSupportTrees: true,
  //   // staticAddonTrees: true,
  //   // staticHelpers: true,
  //   // staticModifiers: true,
  //   // staticComponents: true,
  //   // staticEmberSource: true,
  //   // splitAtRoutes: ['route.name'], // can also be a RegExp
  //   //packagerOptions: {
  //   //  webpackConfig: { }
  //   // }
  // });
};
