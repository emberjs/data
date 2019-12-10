'use strict';
const merge = require('broccoli-merge-trees');
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');
const version = require('@ember-data/private-build-infra/src/create-version-module');

const addonBaseConfig = addonBuildConfigForDataPackage('ember-data');

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      '@ember-data/record-data/-private',
      'ember-data/version',
      '@ember-data/store/-private',
      '@ember-data/store',
      '@ember-data/model',
      '@ember-data/model/-private',
    ];
  },
  treeForAddon(tree) {
    // if we don't do this we won't have a super in addonBaseConfig
    // as a regex is used to decide if to add one for the method
    this._originalSuper = this._super;
    tree = merge([tree, version()]);
    return addonBaseConfig.treeForAddon.call(this, tree);
  },
});
