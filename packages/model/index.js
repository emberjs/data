'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const name = require('./package').name;

const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      '@ember/application',
      '@ember/debug',
      '@ember/error',
      '@ember/utils',
      '@ember/object',
      '@ember/object/computed',
      '@ember/array',
      '@ember/array/proxy',
      '@ember/array/mutable',
      '@ember/polyfills',
      '@ember-data/canary-features',
      '@ember-data/store',
      '@ember-data/store/-private',
      'ember-inflector',
      'ember',
      'rsvp',
    ];
  },
});
