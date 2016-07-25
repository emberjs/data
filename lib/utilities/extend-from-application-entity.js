var stringUtil  = require('ember-cli-string-utils');
var SilentError = require('silent-error');
var pathUtil    = require('ember-cli-path-utils');
var existsSync  = require('exists-sync');
var path        = require('path');

module.exports = function(type, baseClass, options) {
  var entityName      = options.entity.name;
  var isAddon         = options.inRepoAddon || options.project.isEmberCLIAddon();
  var relativePath    = pathUtil.getRelativePath(options.entity.name);

  if (options.pod && options.podPath) {
    relativePath = pathUtil.getRelativePath(options.podPath + options.entity.name);
  }

  var entityDirectory = type + 's';
  var applicationEntityPath = path.join(options.project.root, 'app', entityDirectory, 'application.js');
  var hasApplicationEntity = existsSync(applicationEntityPath);
  if (!isAddon && !options.baseClass && entityName !== 'application' && hasApplicationEntity) {
    options.baseClass = 'application';
  }

  if (options.baseClass === entityName) {
    throw new SilentError(stringUtil.classify(type) + 's cannot extend from themself. To resolve this, remove the `--base-class` option or change to a different base-class.');
  }
  var importStatement = 'import DS from \'ember-data\';';

  if (options.baseClass) {
    baseClass = stringUtil.classify(options.baseClass.replace('\/', '-'));
    baseClass = baseClass + stringUtil.classify(type);
    importStatement = 'import ' + baseClass + ' from \'' + relativePath + options.baseClass + '\';';
  }

  return {
    importStatement: importStatement,
    baseClass: baseClass
  };
};
