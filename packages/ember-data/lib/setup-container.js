import initializeStore from 'ember-data/initializers/store';
import initializeTransforms from 'ember-data/initializers/transforms';
import initializeStoreInjections from 'ember-data/initializers/store-injections';
import initializeDataAdapter from 'ember-data/initializers/data-adapter';
import setupActiveModelContainer from 'activemodel-adapter/setup-container';
import initializeStoreService from 'ember-data/instance-initializers/initialize-store-service';

export default function setupContainer(registry, application) {
  // application is not a required argument. This ensures
  // testing setups can setup a container without booting an
  // entire ember application.

  initializeInjects(registry, application);
  initializeStoreService(registry);
}


export function initializeInjects(registry, application) {
  initializeDataAdapter(registry, application);
  initializeTransforms(registry, application);
  initializeStoreInjections(registry, application);
  setupActiveModelContainer(registry, application);
  initializeStore(registry, application);
}
