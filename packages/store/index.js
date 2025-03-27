'use strict';

const addonBuildConfigForDataPackage = require('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const name = require('./package').name;

const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,

  included() {
    this._super.included.apply(this, arguments);

    this._setupBabelOptions();

    this.import('vendor/assign-polyfill.js');
  },

  externalDependenciesForPrivateModule() {
    return [
      'ember-cached-decorator-polyfill',

      '@ember-data/canary-features',
      '@ember-data/store/-debug',

      '@ember/application',
      '@ember/array/proxy',
      '@ember/array',
      '@ember/debug',
      '@ember/object',
      '@ember/object/computed',
      '@ember/object/evented',
      '@ember/object/internals',
      '@ember/object/mixin',
      '@ember/object/compat',
      '@ember/object/promise-proxy-mixin',
      '@ember/object/proxy',
      '@ember/runloop',
      '@ember/service',
      '@ember/string',
      '@ember/test',
      '@ember/utils',

      'ember-inflector',
      'ember',
      'rsvp',
      'require',

      '@glimmer/tracking',
    ];
  },
});
