'use strict';

const name = require('./package').name;
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: false,
  __isEnabled: null,
  externalDependenciesForPrivateModule() {
    return [];
  },
  treeFor() {
    // Nested addons don't call isEnabled automatically,
    // So this ensures that we return empty trees whenever
    // we are not enabled.
    if (this.isEnabled()) {
      return this._super.treeFor.call(this, ...arguments);
    }
  },
  isEnabled() {
    if (this.__isEnabled !== null) {
      return this.__isEnabled;
    }
    const options = this.getEmberDataConfig();
    const env = process.env.EMBER_ENV;

    this.__isEnabled = env !== 'production' || options.includeDataAdapterInProduction === true;

    return this.__isEnabled;
  },
});
