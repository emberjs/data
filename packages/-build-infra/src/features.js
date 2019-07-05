'use strict';

const { parse } = require('@babel/parser');
const fs = require('fs');

// See ember-source for other implementation to parse typescript file
function extractFeaturesHash() {
  let fileName = require.resolve('@ember-data/canary-features/addon/index.js');
  let fileContents = fs.readFileSync(fileName, { encoding: 'utf8' }).toString();
  let parsed = parse(fileContents, { sourceType: 'module' })
  return parsed.program.body;
}
function getFeatures() {
  const features = {
    SAMPLE_FEATURE_FLAG: null,
    RECORD_DATA_ERRORS: null,
    RECORD_DATA_STATE: null,
  };
  console.log(extractFeaturesHash());

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
