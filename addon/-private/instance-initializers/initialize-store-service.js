import { deprecate } from 'ember-data/-private/debug';
/*
  Configures a registry for use with an Ember-Data
  store.

  @method initializeStoreService
  @param {Ember.ApplicationInstance} applicationOrRegistry
*/
export default function initializeStoreService(application) {
  let container = application.lookup ? application : application.container;
  // Eagerly generate the store so defaultStore is populated.
  container.lookup('service:store');

  let initializers = application.application.constructor.initializers;
  deprecateOldEmberDataInitializers(initializers)
}



let deprecatedInitializerNames = ['data-adapter', 'injectStore', 'transforms', 'store'];

function matchesDeprecatedInititalizer(name) {
  return deprecatedInitializerNames.indexOf(name) !== -1;
}

function deprecateOldEmberDataInitializers(initializers) {
  // collect all of the initializers
  let initializersArray = Object.keys(initializers).map(key =>  initializers[key]);

  // filter out all of the Ember Data initializer. We have some
  // deprecated initializers that depend on other deprecated
  // initializers which may trigger the deprecation warning
  // unintentionally.
  let nonEmberDataInitializers = initializersArray.filter((initializer) => {
    return !matchesDeprecatedInititalizer(initializer.name)
  })

  nonEmberDataInitializers.forEach(warnForDeprecatedInitializers)
}

function warnForDeprecatedInitializers(initializer) {
  var deprecatedBeforeInitializer = matchesDeprecatedInititalizer(initializer.before)
  var deprecatedAfterInitializer = matchesDeprecatedInititalizer(initializer.after)
  let deprecatedProp = deprecatedBeforeInitializer ? 'before' : 'after'

  deprecate(
    `The initializer \`${initializer[deprecatedProp]}\` has been deprecated. Please update your \`${initializer.name}\` initializer to use use \`${deprecatedProp}: \'ember-data\'\` instead.`,
    !(deprecatedBeforeInitializer || deprecatedAfterInitializer),
    {
      id: 'ds.deprecated-initializers',
      until: '3.0.0'
    })
}
