/* eslint node/no-unpublished-require: 'off' */

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  // allows testing with env config for stripping all deprecations
  const compatWith = process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null;
  const plugins = [
    ...require('@ember-data/private-build-infra/src/debug-macros')({
      compatWith,
      debug: {},
      features: {},
      deprecations: {},
    }),
  ];

  let app = new EmberApp(defaults, {
    emberData: {
      compatWith,
    },
    // Add options here
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins,
    },
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  return app.toTree();
};
