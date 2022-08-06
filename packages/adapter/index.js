'use strict';
import { importSync } from '@embroider/macros';

const addonBuildConfigForDataPackage = importSync('@ember-data/private-build-infra/src/addon-build-config-for-data-package');

const name = importSync('./package').name;

const addonBaseConfig = addonBuildConfigForDataPackage(name);

module.exports = Object.assign({}, addonBaseConfig, {
  shouldRollupPrivate: true,
  externalDependenciesForPrivateModule() {
    return [
      'require',
      'rsvp',
      'ember-inflector',
      '@ember/debug',
      '@ember/string',
      '@ember/object',
      '@ember/object/mixin',
      '@ember/application',
      '@glimmer/env',
      '@ember/runloop',
      '@ember/polyfills',
      'ember-inflector',
    ];
  },
});
