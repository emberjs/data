var babelBuild    = require('./babel-build');
var strippedBuildPlugins = require('./stripped-build-plugins');

module.exports = function(packageName, tree, environmentBuildingFor) {
  var options = strippedBuildPlugins(environmentBuildingFor);

  return babelBuild(packageName, tree, options);
};
