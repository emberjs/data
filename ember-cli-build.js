/* global require, module */
/* jshint node: true*/
var EmberApp = require('ember-cli/lib/broccoli/ember-addon');
var merge    = require('broccoli-merge-trees');
var globals  = require('./lib/globals');
var yuidoc   = require('./lib/yuidoc');

module.exports = function(defaults) {
  var app = new EmberApp(defaults, {
    jscsOptions: {
      enabled: true,
      excludeFiles: ['tests/dummy/config']
    }
    // Add options here
  });

  /*
    This build file specifes the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  var appTree = app.toTree();

  if (process.env.EMBER_ENV === 'production') {
    var globalsBuild = globals('addon', 'config/package-manager-files');
    return merge([appTree, globalsBuild, yuidoc()]);
  } else {
    return appTree;
  }
};
