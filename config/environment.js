'use strict';

var fs = require('fs');
var featuresJson = fs.readFileSync('config/features.json', { encoding: 'utf8' });
var featureFlags = JSON.parse(featuresJson);

module.exports = function(environment, appConfig) {
  var ENV = { };

  ENV.EmberENV = {
    FEATURES: featureFlags,
    ENABLE_DS_FILTER: true,

    // don't raise on deprecation yet, since there are too many thrown errors;
    // this should be addressed in another PR
    // RAISE_ON_DEPRECATION: true
  };

  if (environment === 'test-optional-features') {
    ENV.EmberENV.ENABLE_OPTIONAL_FEATURES = true;
  }

  return ENV;
};
