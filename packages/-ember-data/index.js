'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage('ember-data');

module.exports = Object.assign(addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return ['ember-data/version', '@ember-data/store/-private', '@ember-data/store', '@ember-data/model'];
  },
});
