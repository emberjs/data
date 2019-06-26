'use strict';

const name = require('./package').name;
const addonBuildConfigForDataPackage = require('@ember-data/-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign(addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return ['@ember-data/canary-features', '@ember-data/store', '@ember-data/store/-private'];
  },
});
