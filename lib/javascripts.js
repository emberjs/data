var filterImports = require('babel-plugin-filter-imports');
var babel         = require('broccoli-babel-transpiler');
var merge         = require('broccoli-merge-trees');
var concat        = require('broccoli-concat');
var uglify        = require('broccoli-uglify-sourcemap');
var stew          = require('broccoli-stew');
var version       = require('./version');
var path          = require('path');
var Funnel        = require('broccoli-funnel');
var versionReplace = require('./version-replace');

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
    moduleId: true,
    // Transforms /index.js files to use their containing directory name
    getModuleId: function (name) {
      return name.replace(/\/index$/g, '');
    },
    resolveModuleSource: function(name, filename) {
      if (name.indexOf('.') === 0) {
        return libraryName + '/' + path.join(path.dirname(filename), name);
      } else {
        return name;
      }
    }
  };

  Object.keys(_options).forEach(function(opt) {
    options[opt] = _options[opt];
  });

  return options;
}

function debugBuild(packageName, tree) {
  var compiled = babel(tree, babelOptions(packageName));
  return stew.mv(compiled, packageName);
}

function strippedBuild(packageName, tree) {
  var plugins = [
    filterImports({
      'ember-data/debug': [
        'assert',
        'debug',
        'deprecate',
        'info',
        'runInDebug',
        'warn',
        'debugSeal'
      ]
    })
  ];

  var withoutDebug = new Funnel(tree, {
    exclude: ['debug.js']
  });

  var compiled = babel(tree , babelOptions(packageName, {
    plugins: plugins
  }));

  return stew.mv(compiled, packageName);
}

function collapse(tree, outputFileName) {
  var bowerDir = path.join(__dirname, '..', 'bower_components', 'loader.js');
  var loader = new Funnel(bowerDir, {
    include: ['loader.js']
  });

  var emberShim = new Funnel(__dirname, {
    include: ['ember-shim.js']
  });

  var generatorDir = path.join(__dirname, '..', 'generators');
  var license = new Funnel(generatorDir, {include: ['license.js']});
  license = versionReplace(license);

  var withLoader = merge([tree, loader, license, emberShim]);
  return concat(withLoader, {
    inputFiles: ['license.js', 'loader.js', '**/*.js'],
    outputFile: '/' + outputFileName,
    header: '(function(){ \n"use strict";\n',
    footer: '\nrequire("ember-data");\n})();\n'
  });
}

function minify(tree) {
  return uglify(tree, {
    sourceMapIncludeSources: false,
    sourceMapConfig: {
      enabled: false
    }
  });
}


module.exports = function(tree) {
  var emberInflector = new Funnel(path.dirname(require.resolve('ember-inflector/addon')), {
    include: ['**/*.js']
  });
  var emberData = merge([tree, version()]);

  var javascripts = merge([
    debugBuild('ember-inflector', emberInflector),
    debugBuild('ember-data', emberData)
  ]);

  var strippedJavascripts = merge([
    strippedBuild('ember-inflector', emberInflector),
    strippedBuild('ember-data', emberData)
  ]);

  var debug = collapse(javascripts, 'ember-data.js');
  var production = collapse(strippedJavascripts, 'ember-data.prod.js');
  var minified = stew.rename(minify(production), 'ember-data.prod.js', 'ember-data.min.js');

  return merge([debug, production, minified]);
};
