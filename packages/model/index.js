'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const name = require('./package').name;

const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      'ember-cached-decorator-polyfill',

      '@ember-data/canary-features',
      '@ember-data/store',
      '@ember-data/store/-private',

      '@ember/application',
      '@ember/array',
      '@ember/array/mutable',
      '@ember/array/proxy',
      '@ember/debug',
      '@ember/error',
      '@ember/object',
      '@ember/object/compat',
      '@ember/object/computed',
      '@ember/object/internals',
      '@ember/polyfills',
      '@ember/runloop',
      '@ember/utils',

      '@glimmer/tracking/primitives/cache',
      '@glimmer/tracking',
      'ember-inflector',
      'ember',
      'rsvp',
    ];
  },
});
