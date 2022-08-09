'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const addonBaseConfig = addonBuildConfigForDataPackage(require('./package'));

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      '@ember/object',
      '@ember/application',
      '@ember/string',
      '@ember/utils',
      '@ember/debug',
      '@ember/polyfills',
      '@ember/array',
      '@ember/object/mixin',
      '@ember/string',
      'ember-inflector',
    ];
  },
});
