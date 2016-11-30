/* eslint-env node */

var fs = require('fs');
var path = require('path');
var featuresJsonPath = path.join(__dirname, '../../../config/features.json');
var featuresJson = fs.readFileSync(featuresJsonPath, { encoding: 'utf8' });
var featureFlags = JSON.parse(featuresJson);

module.exports = function(environment) {
  var ENV = {
    modulePrefix: 'dummy',
    podModulePrefix: 'dummy/routes',
    environment: environment,
    rootURL: '/',
    locationType: 'auto',
    EmberENV: {
      FEATURES: featureFlags,
      ENABLE_DS_FILTER: true,
      RAISE_ON_DEPRECATION: true
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  };

  if (environment === 'test-optional-features') {
    ENV.EmberENV.ENABLE_OPTIONAL_FEATURES = true;
  }

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  if (environment === 'production') {

  }

  return ENV;
};
