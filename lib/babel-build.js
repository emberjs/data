var babel = require('broccoli-babel-transpiler');
var path  = require('path');
var moduleResolve = require('amd-name-resolver').moduleResolve;

function babelOptions(libraryName, _options) {
  _options = _options || {};

  var options = {
    whitelist: [
      'es6.templateLiterals',
      'es6.parameters',
      'es6.arrowFunctions',
      'es6.destructuring',
      'es6.spread',
      'es6.properties.computed',
      'es6.properties.shorthand',
      'es6.blockScoping',
      'es6.constants',
      'es6.modules'
    ],
    sourceMaps: false,
    modules: 'amdStrict',
    moduleRoot: libraryName,
    moduleIds: true,
    // Transforms /index.js files to use their containing directory name
    getModuleId: function (name) {
      return name.replace(/\/index$/g, '');
    },
    resolveModuleSource: function(source, fileName) {
      return moduleResolve.call(this, source, libraryName + '/' + fileName);
    }
  };

  Object.keys(_options).forEach(function(opt) {
    options[opt] = _options[opt];
  });

  return options;
}

module.exports = function(packageName, tree, _options) {
  var options = babelOptions(packageName, _options);

  return babel(tree, options);
}
