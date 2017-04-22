import {
  DebugAdapter,
  Store
} from './-private';
import JSONAPISerializer from './serializers/json-api';
import JSONSerializer from './serializers/json';
import RESTSerializer from './serializers/rest';
import JSONAPIAdapter from './adapters/json-api';
import RESTAdapter from './adapters/rest';

import NumberTransform from './transforms/number';
import DateTransform from './transforms/date';
import StringTransform from './transforms/string';
import BooleanTransform from './transforms/boolean';

function has(applicationOrRegistry, fullName) {
  if (applicationOrRegistry.has) {
    // < 2.1.0
    return applicationOrRegistry.has(fullName);
  } else {
    // 2.1.0+
    return applicationOrRegistry.hasRegistration(fullName);
  }
}

/*
 Configures a registry for use with an Ember-Data
 store. Accepts an optional namespace argument.

 @method initializeStore
 @param {Ember.Registry} registry
 */
function initializeStore(registry) {
  // registry.optionsForType for Ember < 2.1.0
  // application.registerOptionsForType for Ember 2.1.0+
  let registerOptionsForType = registry.registerOptionsForType || registry.optionsForType;
  registerOptionsForType.call(registry, 'serializer', { singleton: false });
  registerOptionsForType.call(registry, 'adapter', { singleton: false });

  registry.register('serializer:-default', JSONSerializer);
  registry.register('serializer:-rest', RESTSerializer);
  registry.register('adapter:-rest', RESTAdapter);

  registry.register('adapter:-json-api', JSONAPIAdapter);
  registry.register('serializer:-json-api', JSONAPISerializer);


  if (!has(registry, 'service:store')) {
    registry.register('service:store', Store);
  }
}

/*
 Configures a registry with injections on Ember applications
 for the Ember-Data store. Accepts an optional namespace argument.

 @method initializeDebugAdapter
 @param {Ember.Registry} registry
 */
function initializeDataAdapter(registry) {
  registry.register('data-adapter:main', DebugAdapter);
}

/*
 Configures a registry with injections on Ember applications
 for the Ember-Data store. Accepts an optional namespace argument.

 @method initializeStoreInjections
 @param {Ember.Registry} registry
 */
function initializeStoreInjections(registry) {
  // registry.injection for Ember < 2.1.0
  // application.inject for Ember 2.1.0+
  let inject = registry.inject || registry.injection;
  inject.call(registry, 'controller', 'store', 'service:store');
  inject.call(registry, 'route', 'store', 'service:store');
  inject.call(registry, 'data-adapter', 'store', 'service:store');
}

/*
 Configures a registry for use with Ember-Data
 transforms.

 @method initializeTransforms
 @param {Ember.Registry} registry
 */
function initializeTransforms(registry) {
  registry.register('transform:boolean', BooleanTransform);
  registry.register('transform:date', DateTransform);
  registry.register('transform:number', NumberTransform);
  registry.register('transform:string', StringTransform);
}

export default function setupContainer(application) {
  initializeDataAdapter(application);
  initializeTransforms(application);
  initializeStoreInjections(application);
  initializeStore(application);
}
