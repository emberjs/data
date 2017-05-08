import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

let deprecateOldEmberDataInitializers;

/*
  Configures a registry for use with an Ember-Data
  store.

  @method initializeStoreService
  @param {Ember.ApplicationInstance | Ember.EngineInstance} instance
*/
export default function initializeStoreService(instance) {
  // instance.lookup supports Ember 2.1 and higher
  // instance.container supports Ember 1.11 - 2.0
  const container = instance.lookup ? instance : instance.container;

  // Eagerly generate the store so defaultStore is populated.
  container.lookup('service:store');

  if (DEBUG) {
    // In Ember 2.4+ instance.base is the `Ember.Application` or `Ember.Engine` instance
    // In Ember 1.11 - 2.3 we fallback to `instance.application`
    let base = instance.base || instance.application;
    deprecateOldEmberDataInitializers(base.constructor.initializers);
  }
}

if (DEBUG) {
  const DEPRECATED_INITIALIZER_NAMES = ['data-adapter', 'injectStore', 'transforms', 'store'];

  let matchesDeprecatedInititalizer = function matchesDeprecatedInititalizer(name) {
    return DEPRECATED_INITIALIZER_NAMES.indexOf(name) !== -1;
  };

  let warnForDeprecatedInitializers = function warnForDeprecatedInitializers(initializer) {
    let deprecatedBeforeInitializer = matchesDeprecatedInititalizer(initializer.before);
    let deprecatedAfterInitializer = matchesDeprecatedInititalizer(initializer.after);
    let deprecatedProp = deprecatedBeforeInitializer ? 'before' : 'after';

    deprecate(
      `The initializer \`${initializer[deprecatedProp]}\` has been deprecated. Please update your \`${initializer.name}\` initializer to use use \`${deprecatedProp}: \'ember-data\'\` instead.`,
      !(deprecatedBeforeInitializer || deprecatedAfterInitializer),
      {
        id: 'ds.deprecated-initializers',
        until: '3.0.0'
      });
  };

  deprecateOldEmberDataInitializers = function deprecateOldEmberDataInitializers(initializers) {
    // collect all of the initializers
    let keys = Object.keys(initializers);

    for (let i = 0; i < keys.length; i++) {
      let name = keys[i];

      // filter out all of the Ember Data initializer. We have some
      // deprecated initializers that depend on other deprecated
      // initializers which may trigger the deprecation warning
      // unintentionally.
      if (!matchesDeprecatedInititalizer(name)) {
        warnForDeprecatedInitializers(initializers[name]);
      }
    }
  };
}
