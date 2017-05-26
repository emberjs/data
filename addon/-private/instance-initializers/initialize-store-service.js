import { deprecate } from 'ember-data/-private/debug';

/*
  Configures a registry for use with an Ember-Data
  store.

  @method initializeStoreService
  @param {Ember.ApplicationInstance} applicationOrRegistry
*/
export default function initializeStoreService(application) {
  const container = application.lookup ? application : application.container;

  // Eagerly generate the store so defaultStore is populated.
  container.lookup('service:store');

  deprecateOldEmberDataInitializers(application.application.constructor.initializers);
}

const DEPRECATED_INITIALIZER_NAMES = ['data-adapter', 'injectStore', 'transforms', 'store'];

function matchesDeprecatedInititalizer(name) {
  return DEPRECATED_INITIALIZER_NAMES.indexOf(name) !== -1;
}

function deprecateOldEmberDataInitializers(initializers) {
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
}

function warnForDeprecatedInitializers(initializer) {
  let deprecatedBeforeInitializer = matchesDeprecatedInititalizer(initializer.before);
  let deprecatedAfterInitializer = matchesDeprecatedInititalizer(initializer.after);
  let deprecatedProp = deprecatedBeforeInitializer ? 'before' : 'after';

  deprecate(
    `The initializer \`${initializer[deprecatedProp]}\` has been deprecated. Please update your \`${initializer.name}\` initializer to use use \`${deprecatedProp}: \'ember-data\'\` instead.`,
    !(deprecatedBeforeInitializer || deprecatedAfterInitializer),
    {
      id: 'ds.deprecated-initializers',
      until: '3.0.0'
    })
}
