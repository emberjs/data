'use strict';

var path = require('path');
var fs = require('fs');
var resolve = require('resolve');

var FilterImports = requireBabelPlugin('babel-plugin-filter-imports');
var FeatureFlags  = requireBabelPlugin('babel-plugin-feature-flags');
var StripHeimdall = requireBabelPlugin('babel6-plugin-strip-heimdall');
var StripClassCallCheck = requireBabelPlugin('babel6-plugin-strip-class-callcheck');
var StripFilteredImports = require('./transforms/babel-plugin-remove-imports');
var TransformBlockScoping = requireBabelPlugin('babel-plugin-transform-es2015-block-scoping');

function uniqueAdd(obj, key, values) {
  var a = obj[key] = obj[key] || [];

  for (var i = 0; i < values.length; i++) {
    if (a.indexOf(values[i]) === -1) {
      a.push(values[i]);
    }
  }
}

// ensures that a `baseDir` property is present on the babel plugins
// that we will be using, this prevents ember-cli-babel/broccoli-babel-transpiler
// from opting out of caching (and printing a giant warning)
function requireBabelPlugin(packageName) {
  var Plugin = require(packageName);
  var PluginPath = resolve.sync(packageName + '/package.json', { basedir: __dirname });

  return addBaseDir(Plugin, path.dirname(PluginPath));
}

function addBaseDir(Plugin, baseDir) {
  let type = typeof Plugin;

  if (type === 'function' && !Plugin.baseDir) {
    Plugin.baseDir = () => baseDir;
  } else if (type === 'object' && Plugin !== null && Plugin.default) {
    addBaseDir(Plugin.default, baseDir);
  }

  return Plugin;
}

module.exports = function(environment) {
  var featuresJsonPath = __dirname + '/../config/features.json';
  var featuresJson = fs.readFileSync(featuresJsonPath, { encoding: 'utf8' });
  var features = JSON.parse(featuresJson);
  var filteredImports = {};

  // TODO explicitly set all features which are not enabled to `false`, so
  // they are stripped --> make this configurable or pass features
  //
  // for (var feature in features) {
  //   if (features[feature] !== true) {
  //     features[feature] = false;
  //   }
  // }

  var postTransformPlugins = [];
  var plugins = [
    [FeatureFlags, {
      import: { module: 'ember-data/-private/features' },
      features: features
    }]
  ];

  if (process.env.INSTRUMENT_HEIMDALL === 'false') {
    plugins.push([StripHeimdall]);
    uniqueAdd(filteredImports, 'ember-data/-debug', ['instrument']);
  } else {
    console.warn('NOT STRIPPING HEIMDALL');
  }

  if (/production/.test(environment) || process.env.INSTRUMENT_HEIMDALL === 'true') {
    postTransformPlugins.push([StripClassCallCheck]);
    uniqueAdd(filteredImports, 'ember-data/-debug', [
      'assertPolymorphicType'
    ]);
  }

  plugins.push(
    [FilterImports, filteredImports],
    [StripFilteredImports, filteredImports],
    [TransformBlockScoping, { 'throwIfClosureRequired': true }]
  );

  return { plugins, postTransformPlugins };
};
