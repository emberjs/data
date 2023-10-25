/* eslint-disable n/no-unpublished-require */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    emberData: {
      compatWith: '99.0',
    },
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [
        ...require('@ember-data/private-build-infra/src/debug-macros')({
          compatWith: '99.0',
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

  const { Webpack } = require('@embroider/webpack');
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
