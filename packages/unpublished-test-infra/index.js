'use strict';

const version = require('@ember-data/private-build-infra/src/create-version-module');
const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const name = require('./package').name;

const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  treeForAddon() {
    if (process.env.EMBER_CLI_TEST_COMMAND) {
      const options = this.getEmberDataConfig();
      let compatVersion = options.compatWith;
      let tree = version(compatVersion);
      return this.debugTree(this._super.treeForAddon.call(this, tree), 'addon-output');
    }
  },
});
