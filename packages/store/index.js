'use strict';

const name = require('./package').name;
const addonBuildConfigForDataPackage = require('@ember-data/-build-infra/src/addon-build-config-for-data-package');

module.exports = addonBuildConfigForDataPackage(name);
