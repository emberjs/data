'use strict';

const name = require('./package').name;
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: false,
  externalDependenciesForPrivateModule() {
    return [];
  },
});
