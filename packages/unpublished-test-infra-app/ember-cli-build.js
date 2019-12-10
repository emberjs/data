/* eslint node/no-unpublished-require: 'off' */

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    emberData: {
      compatWith: process.env.COMPAT_WITH,
    },
  });
  return app.toTree();
};
