'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function(defaults) {
  let app = new EmberAddon(defaults, {
    babel: {
      // this ensures that the same `@ember-data/canary-features` processing that the various
      // ember-data addons do is done in the dummy app
      plugins: [...require('@ember-data/private-build-infra/src/debug-macros')()],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
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
