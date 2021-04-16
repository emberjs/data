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
      '@ember/polyfills',
      '@ember/service',
      '@ember/runloop',
      '@ember/object',
      '@ember/object/promise-proxy-mixin',
      '@ember/object/computed',
      '@ember/object/evented',
      '@ember/object/proxy',
      '@ember/object/mixin',
      '@ember/object/internals',
      '@ember/array',
      '@ember/array/proxy',
      '@ember/test',
      '@ember-data/canary-features',
      'ember-inflector',
      '@ember-data/store/-debug',
      'ember',
      'require',
      '@ember/string',
      'rsvp',
    ];
  },
});
