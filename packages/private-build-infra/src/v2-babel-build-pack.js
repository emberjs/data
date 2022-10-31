const pkg = require('../package.json');

// eslint-disable-next-line import/order
const requireModule = require('./utilities/require-module');

const debugFlags = requireModule('@ember-data/private-build-infra/addon/debugging.ts');
const deprecationFlags = requireModule('@ember-data/private-build-infra/addon/current-deprecations.ts');
const featureFlags = requireModule('@ember-data/canary-features/addon/default-features.ts');

const isCanary = pkg.version.includes('alpha');

const features = {};
Object.keys(featureFlags).forEach((flag) => {
  if (isCanary) {
    features[flag] = featureFlags[flag];
  } else {
    const value = featureFlags[flag];

    if (value === null) {
      features[flag] = false;
    } else {
      features[flag] = value;
    }
  }
});

const config = {
  debug: Object.assign({}, debugFlags.default),
  deprecations: Object.assign({}, deprecationFlags.default),
  features,
};

const plugins = require('./debug-macros')(config);

module.exports = plugins;
