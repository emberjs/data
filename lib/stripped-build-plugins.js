var fs            = require('fs');
var path          = require('path');
var filterImports = require('babel-plugin-filter-imports');
var featureFlags  = require('babel-plugin-feature-flags');

module.exports = function(environment) {
  var featuresJsonPath = __dirname + '/../config/features.json';
  var featuresJson = fs.readFileSync(featuresJsonPath, { encoding: 'utf8' });
  var features = JSON.parse(featuresJson);

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

  if (environment === 'production') {
    plugins.push(
      filterImports({
        'ember-data/-private/debug': [
          'assert',
          'assertPolymorphicType',
          'debug',
          'deprecate',
          'info',
          'runInDebug',
          'warn',
          'debugSeal'
        ]
      })
    );
  }

  return plugins;
};
