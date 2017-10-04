'use strict';

var path = require('path');
var fs            = require('fs');
var FilterImports = require('babel-plugin-filter-imports');
var FeatureFlags  = require('babel-plugin-feature-flags');
var StripHeimdall = require('babel6-plugin-strip-heimdall');
var StripClassCallCheck = require('babel6-plugin-strip-class-callcheck');
var StripFilteredImports = require('./transforms/babel-plugin-remove-imports');
var TransformBlockScoping = require('babel-plugin-transform-es2015-block-scoping');

function uniqueAdd(obj, key, values) {
  var a = obj[key] = obj[key] || [];

  for (var i = 0; i < values.length; i++) {
    if (a.indexOf(values[i]) === -1) {
      a.push(values[i]);
    }
  }
}

function addBaseDir(Plugin) {
  let type = typeof Plugin;

  if (type === 'function' && !Plugin.baseDir) {
    Plugin.baseDir = () => path.join(__dirname, '..');
  } else if (type === 'object' && Plugin !== null && Plugin.default) {
    addBaseDir(Plugin.default);
  }
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

  if (environment === 'production' || process.env.INSTRUMENT_HEIMDALL === 'true') {
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

  // ensures that a `baseDir` property is present on the babel plugins
  // that we will be using, this prevents ember-cli-babel/broccoli-babel-transpiler
  // from opting out of caching (and printing a giant warning)
  plugins.forEach((pluginWithOptions) => addBaseDir(pluginWithOptions[0]));


  return { plugins, postTransformPlugins };
};
