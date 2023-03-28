'use strict';

const version = require('../package.json').version;

const isCanary = version.includes('alpha');

const requireModule = require('./utilities/require-module');

function getFeatures(isProd) {
  const { default: org_features } = requireModule(
    '@ember-data/private-build-infra/virtual-packages/canary-features.js'
  );
  const features = Object.assign({}, org_features);

  if (!isCanary) {
    // disable all features with a current value of `null`
    for (let feature in features) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = false;
      }
    }
    return features;
  }

  const FEATURE_OVERRIDES = process.env.EMBER_DATA_FEATURE_OVERRIDE;
  if (FEATURE_OVERRIDES === 'ENABLE_ALL_OPTIONAL') {
    // enable all features with a current value of `null`
    for (let feature in features) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = true;
      }
    }
  } else if (FEATURE_OVERRIDES === 'DISABLE_ALL') {
    // disable all features, including those with a value of `true`
    for (let feature in features) {
      features[feature] = false;
    }
  } else if (FEATURE_OVERRIDES) {
    // enable only the specific features listed in the environment
    // variable (comma separated)
    const forcedFeatures = FEATURE_OVERRIDES.split(',');
    for (let i = 0; i < forcedFeatures.length; i++) {
      let featureName = forcedFeatures[i];

      features[featureName] = true;
    }
  }

  if (isProd) {
    // disable all features with a current value of `null`
    for (let feature in features) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = false;
      }
    }
  }

  return features;
}

module.exports = getFeatures;
