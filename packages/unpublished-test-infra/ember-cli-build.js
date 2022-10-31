/* eslint node/no-unpublished-require: 'off' */

'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

const compatWith = process.env.COMPAT_WITH || '0.0.0';

module.exports = function (defaults) {
  let app = new EmberAddon(defaults, {
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
        }),
      ],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      enableTypeScriptTransform: true,
    },
  });

  return app.toTree();
};
