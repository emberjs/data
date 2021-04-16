'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const name = require('./package').name;

const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      '@ember/debug',
      '@ember/runloop',
      '@ember/polyfills',
      '@ember/object',
      '@ember/object/internals',
      '@ember/utils',
      'ember',
      '@ember-data/store/-debug',
      '@ember-data/store/-private',
      '@ember-data/store',
      '@ember-data/canary-features',
    ];
  },
});
