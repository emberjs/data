/* eslint-env node */

var merge         = require('broccoli-merge-trees');
var concat        = require('broccoli-concat');
var uglify        = require('broccoli-uglify-sourcemap');
var stew          = require('broccoli-stew');
var version       = require('./version');
var fs            = require('fs');
var path          = require('path');
var Funnel        = require('broccoli-funnel');
var versionReplace = require('./version-replace');
var fileCreator   = require('broccoli-file-creator');
var strippedBuild = require('./stripped-build');

function debugBuild(packageName, tree) {
  var compiled = strippedBuild(packageName, tree, 'development');

  return stew.mv(compiled, packageName);
}

function makeStrippedBuild(packageName, tree) {
  var withoutDebug = new Funnel(tree, {
    exclude: ['ember-data/-private/debug.js']
  });

  var stripped = strippedBuild(packageName, withoutDebug, 'production');

  return stew.mv(stripped, packageName);
}

function collapse(tree, outputFileName) {
  var loaderDir = path.join(__dirname, '..', 'node_modules', 'loader.js', 'lib', 'loader');
  var loader = new Funnel(loaderDir, {
    include: ['loader.js']
  });

  var emberShim = new Funnel(__dirname, {
    include: ['ember-shim.js']
  });

  var generatorDir = path.join(__dirname, '..', 'generators');
  var license = new Funnel(generatorDir, {include: ['license.js']});
  license = versionReplace(license);

  var emberDataShimsPath = path.join(__dirname, 'ember-data-shims.js');
  var emberDataShims = fs.readFileSync(emberDataShimsPath, { encoding: 'utf8' });
  var dsGlobalPath = path.join(__dirname, 'ds-global.js');
  var dsGlobal = fs.readFileSync(dsGlobalPath, { encoding: 'utf8' });

  var withLoader = merge([tree, loader, license, emberShim]);
  return concat(withLoader, {
    inputFiles: ['license.js', 'loader.js', '**/*.js'],
    outputFile: '/' + outputFileName,
    header: '(function(){ \n"use strict";\n',
    footer: '\nrequire("ember-data");\nrequire("ember-load-initializers")["default"](Ember.Application, "ember-data");\n' + dsGlobal + '})();\n' + emberDataShims
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

function buildEmberInflector() {
  var emberInflector = new Funnel(path.dirname(require.resolve('ember-inflector/addon')), {
    include: ['**/*.js']
  });

  return debugBuild('ember-inflector', emberInflector);
}

function buildLoadInitializers() {
  var emberLoadInitializers = new Funnel(path.dirname(require.resolve('ember-load-initializers/addon')), {
    include: ['**/*.js']
  });

  return debugBuild('ember-load-initializers', emberLoadInitializers);
}

module.exports = function(tree) {
  var emberInflector = buildEmberInflector();
  var loadInitializers = buildLoadInitializers();
  var emberData = merge([tree, version()]);

  var javascripts = merge([
    emberInflector,
    loadInitializers,
    debugBuild('ember-data/initializers', 'app/initializers'),
    debugBuild('ember-data/instance-initializers', 'app/instance-initializers'),
    debugBuild('ember-data', emberData)
  ]);

  var strippedJavascripts = merge([
    emberInflector,
    loadInitializers,
    makeStrippedBuild('ember-data/initializers', 'app/initializers'),
    makeStrippedBuild('ember-data/instance-initializers', 'app/instance-initializers'),
    makeStrippedBuild('ember-data', emberData)
  ]);

  var debug = collapse(javascripts, 'ember-data.js');
  var production = collapse(strippedJavascripts, 'ember-data.prod.js');
  var minified = stew.rename(minify(production), 'ember-data.prod.js', 'ember-data.min.js');
  // Hack to get around https://github.com/emberjs/data/blob/v2.1.0/lib/ember-addon/index.js#L28
  var emptySourcemapFile = fileCreator('ember-data.js.map', '');

  return merge([debug, production, minified, emptySourcemapFile]);
};
