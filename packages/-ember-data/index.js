'use strict';
const merge = require('broccoli-merge-trees');
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');
const version = require('@ember-data/private-build-infra/src/create-version-module');

const addonBaseConfig = addonBuildConfigForDataPackage(require('./package.json'));

module.exports = Object.assign({}, addonBaseConfig, {
  treeForAddon(tree) {
    this._originalSuper = this._super;
    tree = merge([tree, version()]);
    return this._super.treeForAddon.call(this, tree);
  },
});
