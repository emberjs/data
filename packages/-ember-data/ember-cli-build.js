'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function (defaults) {
  const isTest = process.env.EMBER_CLI_TEST_COMMAND;
  const isProd = process.env.EMBER_ENV === 'production';
  const shouldTranspile = !!process.env.SHOULD_TRANSPILE;
  const compatWith = process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null;

  const terserSettings = {
    exclude: ['assets/dummy.js', 'assets/tests.js', 'assets/test-support.js', 'dist/docs/*', 'docs/*'],
  };

  if (isTest && isProd && shouldTranspile) {
    terserSettings.enabled = false;
  }

  let app = new EmberAddon(defaults, {
    emberData: {
      compatWith,
    },
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [...require('@ember-data/private-build-infra/src/debug-macros')(null, isProd, compatWith)],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      includeExternalHelpers: true,
    },
    'ember-cli-terser': terserSettings,
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return app.toTree();
};
