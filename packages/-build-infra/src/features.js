'use strict';

function getFeatures() {
  const features = { SAMPLE_FEATURE_FLAG: null };
  let enableFeatures = process.env.EMBER_DATA_FEATURES;
  // turn on all features when given the above environment variable
  if (enableFeatures) {
    for (let key in features) {
      features[key] = true;
    }
  }

  return features;
}

module.exports = getFeatures();
