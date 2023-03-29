const pkg = require('../package.json');

const getEnv = require('./utilities/get-env');
// eslint-disable-next-line import/order
const requireModule = require('./utilities/require-module');

const debugFlags = requireModule('@ember-data/private-build-infra/virtual-packages/debugging.js');
const deprecationFlags = requireModule('@ember-data/private-build-infra/virtual-packages/deprecations.js');
const featureFlags = requireModule('@ember-data/private-build-infra/virtual-packages/canary-features.js');

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
  env: getEnv(),
};

const plugins = require('./debug-macros')(config);

module.exports = plugins;
