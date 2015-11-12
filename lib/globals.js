var merge = require('broccoli-merge-trees');
var js = require('./javascripts');
var versionReplace = require('./version-replace');
var stew = require('broccoli-stew');

module.exports = function(jsDir, configDir) {
  var javascripts = js(jsDir);
  var configFiles = versionReplace(configDir);

  var globalFiles = merge([configFiles, javascripts]);
  return stew.mv(globalFiles, 'globals');
};
