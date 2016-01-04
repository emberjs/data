var fs            = require('fs');
var path          = require('path');
var filterImports = require('babel-plugin-filter-imports');
var featureFlags  = require('babel-plugin-feature-flags');
var babelBuild    = require('./babel-build');

module.exports = function(packageName, tree, _options) {
  var featuresJsonPath = path.join(__dirname, '../config/features.json');
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
    }),

    filterImports({
      'ember-data/-private/debug': [
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

  var options = _options || {};
  options.plugins = plugins;

  return babelBuild(packageName, tree, options);
};
