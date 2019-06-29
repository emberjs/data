'use strict';

const name = require('./package').name;
const addonBuildConfigForDataPackage = require('@ember-data/-build-infra/src/addon-build-config-for-data-package');
const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign(addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      '@ember-data/adapter/error',
      '@ember-data/canary-features',
      'ember-inflector',
      '@ember/ordered-set',
      'ember-data/-debug',
    ];
  },
});
