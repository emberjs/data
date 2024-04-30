import fs from 'fs';

import * as CURRENT_FEATURES from '../../virtual/canary-features.ts';
type FEATURE = keyof typeof CURRENT_FEATURES;

const version = JSON.parse(fs.readFileSync('../../package.json', 'utf-8')).version;
const isCanary = version.includes('alpha');

export function getFeatures(isProd: boolean): { [key in FEATURE]: boolean } {
  const features = Object.assign({}, CURRENT_FEATURES) as Record<FEATURE, boolean>;
  const keys = Object.keys(features) as FEATURE[];

  if (!isCanary) {
    // disable all features with a current value of `null`
    for (const feature of keys) {
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
    for (const feature of keys) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = true;
      }
    }
  } else if (FEATURE_OVERRIDES === 'DISABLE_ALL') {
    // disable all features, including those with a value of `true`
    for (const feature of keys) {
      features[feature] = false;
    }
  } else if (FEATURE_OVERRIDES) {
    // enable only the specific features listed in the environment
    // variable (comma separated)
    const forcedFeatures = FEATURE_OVERRIDES.split(',');
    for (let i = 0; i < forcedFeatures.length; i++) {
      let featureName = forcedFeatures[i];

      if (!keys.includes(featureName as FEATURE)) {
        throw new Error(`Unknown feature flag: ${featureName}`);
      }

      features[featureName as FEATURE] = true;
    }
  }

  if (isProd) {
    // disable all features with a current value of `null`
    for (const feature of keys) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = false;
      }
    }
  }

  return features;
}
