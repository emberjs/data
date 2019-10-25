'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage('ember-data');
const version = require('@ember-data/private-build-infra/src/create-version-module');
const merge = require('broccoli-merge-trees');

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      '@ember-data/record-data/-private',
      'ember-data/version',
      '@ember-data/store/-private',
      '@ember-data/store',
      '@ember-data/model',
    ];
  },
  treeForAddon(tree) {
    tree = merge([tree, version()]);
    return addonBaseConfig.treeForAddon.call(this, tree);
  },
});
