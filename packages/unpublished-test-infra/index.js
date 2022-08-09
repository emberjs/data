'use strict';
// eslint-disable-next-line node/no-unpublished-require
const merge = require('broccoli-merge-trees');
const version = require('@ember-data/private-build-infra/src/create-version-module');
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const addonBaseConfig = addonBuildConfigForDataPackage(require('./package'));

module.exports = Object.assign({}, addonBaseConfig, {
  treeForAddonTestSupport(existingTree) {
    const options = this.getEmberDataConfig();
    let compatVersion = options.compatWith;
    let tree = merge([existingTree, version(compatVersion)]);

    return this.debugTree(this._super.treeForAddonTestSupport.call(this, tree), 'test-support');
  },
});
