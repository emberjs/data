'use strict';

const name = require('./package').name;
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage(name);

function getApp(addon) {
  while (addon && !addon.app) {
    addon = addon.parent;
  }
  if (!addon) {
    throw new Error(`Unable to find the parent application`);
  }
  return addon.app;
}

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
    const options = this.setupOptions();
    const env = getApp(this).env;

    this.__isEnabled = env !== 'production' || options.includeDataAdapterInProduction === true;

    return this.__isEnabled;
  },
  setupOptions() {
    const app = getApp(this);
    const parentIsEmberDataAddon = this.parent.pkg.name === 'ember-data';

    let options = (app.options = app.options || {});
    options.emberData = options.emberData || {};

    if (options.emberData.includeDataAdapterInProduction === undefined) {
      options.emberData.includeDataAdapterInProduction = parentIsEmberDataAddon;
    }
    return options.emberData;
  },
});
