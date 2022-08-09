'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function (defaults) {
  const isProd = process.env.EMBER_ENV === 'production';
  const compatWith = process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null;
  let app = new EmberAddon(defaults, {
    emberData: {
      compatWith,
    },
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [
        ...require('@ember-data/private-build-infra/src/debug-macros')(null, isProd, { compatWith, debug: {} }),
      ],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
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

  return app.toTree();
};
