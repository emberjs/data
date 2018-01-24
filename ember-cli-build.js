/* eslint-env node */
var EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
var merge    = require('broccoli-merge-trees');
var yuidoc   = require('./lib/yuidoc');

module.exports = function(defaults) {
  var app = new EmberAddon(defaults, {});

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  var appTree = app.toTree();

  if (process.env.EMBER_ENV === 'production') {
    return merge([appTree, yuidoc()]);
  } else {
    return appTree;
  }
};
