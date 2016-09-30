var fs            = require('fs');
var path          = require('path');
var filterImports = require('babel-plugin-filter-imports');
var featureFlags  = require('babel-plugin-feature-flags');
var stripHeimdall = require('babel5-plugin-strip-heimdall');

function uniqueAdd(obj, key, values) {
  var a = obj[key] = obj[key] || [];

  for (var i = 0; i < values.length; i++) {
    if (a.indexOf(values[i]) === -1) {
      a.push(values[i]);
    }
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
  var plugins = [
    featureFlags({
      import: { module: 'ember-data/-private/features' },
      features: features
    })
  ];

  if (process.env.INSTRUMENT_HEIMDALL === 'false') {
    plugins.push(stripHeimdall);
    uniqueAdd(filteredImports, 'ember-data/-private/debug', ['instrument']);
  } else {
    console.warn('NOT STRIPPING HEIMDALL');
  }

  if (environment === 'production') {
    uniqueAdd(filteredImports, 'ember-data/-private/debug', [
      'assert',
      'assertPolymorphicType',
      'debug',
      'deprecate',
      'info',
      'runInDebug',
      'warn',
      'debugSeal'
    ]);
  }
  plugins.push(filterImports(filteredImports));

  return plugins;
};
