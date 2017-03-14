var babel = require('broccoli-babel-transpiler');
var path  = require('path');
var moduleResolve = require('amd-name-resolver').moduleResolve;

function babelOptions(libraryName, _options) {
  _options = _options || {};

  var options = {
    plugins: [],
    postTransformPlugins: [],
    sourceMaps: false,
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

  options.plugins = options.plugins.concat([
    ['transform-es2015-modules-amd', { noInterop: true, loose: true }],
    'transform-es2015-arrow-functions',
    'transform-es2015-computed-properties',
    'transform-es2015-shorthand-properties',
    'transform-es2015-template-literals',
    'transform-es2015-parameters',
    'transform-es2015-destructuring',
    'transform-es2015-spread',
    'transform-es2015-block-scoping',
    'transform-es2015-constants',
    ['transform-es2015-classes', { loose: true }],
  ], options.postTransformPlugins).filter(Boolean);

  // this is not a "real" babel option, so we delete it
  delete options.postTransformPlugins;

  return options;
}

module.exports = function(packageName, tree, _options) {
  var options = babelOptions(packageName, _options);

  return babel(tree, options);
};
