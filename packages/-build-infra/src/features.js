'use strict';

function isCanary() {
  const version = require('../package.json').version;
  return version.indexOf('alpha') !== -1;
}

const requireEsm = require('esm')(module);
function getFeatures() {
  const { default: features } = requireEsm('@ember-data/canary-features/addon/default-features.js');

  if (!isCanary) {
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
  } else if (FEATURE_OVERRIDES) {
    // enable only the specific features listed in the environment
    // variable (comma separated)
    const forcedFeatures = FEATURE_OVERRIDES.split(',');
    for (let i = 0; i < forcedFeatures.length; i++) {
      let featureName = forcedFeatures[i];

      features[featureName] = true;
    }
  }

  return features;
}

module.exports = getFeatures();
