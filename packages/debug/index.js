'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const addonBaseConfig = addonBuildConfigForDataPackage(require('./package.json'));

module.exports = Object.assign({}, addonBaseConfig, {
  __isEnabled: null,

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

    const parentIsEmberDataAddon = this.parent.pkg.name === 'ember-data';

    if (options.includeDataAdapterInProduction === undefined) {
      options.includeDataAdapterInProduction = parentIsEmberDataAddon;
    }

    this.__isEnabled = env !== 'production' || options.includeDataAdapterInProduction === true;

    return this.__isEnabled;
  },
});
