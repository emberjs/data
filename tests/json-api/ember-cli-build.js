/* eslint-disable node/no-unpublished-require */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const compatWith = process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : '4.12';
  let app = new EmberApp(defaults, {
    emberData: {
      compatWith,
    },
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [
        ...require('@ember-data/private-build-infra/src/debug-macros')({
          compatWith,
          debug: {},
          features: {},
          deprecations: {},
          env: require('@ember-data/private-build-infra/src/utilities/get-env')(),
        }),
      ],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      enableTypeScriptTransform: true,
    },
    'ember-cli-terser': {
      exclude: ['assets/dummy.js', 'assets/tests.js', 'assets/test-support.js'],
    },
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */
  app.import('node_modules/@warp-drive/diagnostic/dist/styles/dom-reporter.css');
  return app.toTree();
  // const { Webpack } = require('@embroider/webpack');

  // return require('@embroider/compat').compatBuild(app, Webpack, {
  //   staticAddonTestSupportTrees: true,
  //   staticAddonTrees: true,
  //   staticHelpers: true,
  //   staticModifiers: true,
  //   staticComponents: true,
  //   // staticEmberSource: true,
  //   // splitAtRoutes: ['route.name'], // can also be a RegExp
  //   packagerOptions: {
  //     webpackConfig: {},
  //   },
  // });
};
