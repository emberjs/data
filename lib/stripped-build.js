var fs            = require('fs');
var path          = require('path');
var filterImports = require('babel-plugin-filter-imports');
var featureFlags  = require('babel-plugin-feature-flags');
var babelBuild    = require('./babel-build');
var strippedBuildPlugins = require('./stripped-build-plugins');

module.exports = function(packageName, tree, environmentBuildingFor) {
  var options = {};
  options.plugins = strippedBuildPlugins(environmentBuildingFor);

  return babelBuild(packageName, tree, options);
};
