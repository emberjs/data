/* jshint node:true, undef:true, unused:true */

/**
 * Use this to compile ember using the es6-module-transpiler like so:
 *
 *   $ compile-modules convert -f export-variable -r ember-resolver.js -I packages -o ember.js ember-application
 */

var Path = require('path');

var transpiler = require('es6-module-transpiler');
var FileResolver = transpiler.FileResolver;
var utils = require('es6-module-transpiler/lib/utils');

/**
 * Provides resolution of absolute paths from module import sources in the
 * Ember.js source code.
 *
 * @constructor
 */
function EmberResolver(paths) {
  FileResolver.call(this, paths);
}
utils.extend(EmberResolver, FileResolver);

/**
 * Resolves `path` against the importing module `mod`, if given, and the base
 * directory `baseDir`.
 *
 * @param {string} path
 * @param {string} baseDir
 * @param {?Module} mod
 * @return {string}
 */
EmberResolver.prototype.resolvePath = function(importedPath, fromModule) {
  var result = FileResolver.prototype.resolvePath.call(this, importedPath, fromModule);

  if (!result) {
    var match = importedPath.match(/^([^\/]+)\/(.+)$/);
    var path = match ?
        Path.join(match[1], 'lib', match[2]) :
        Path.join(importedPath, 'lib/main');
    result = FileResolver.prototype.resolvePath.call(this, path, fromModule);
  }

  return result;
};

module.exports = EmberResolver;