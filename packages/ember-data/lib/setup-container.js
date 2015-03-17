import initializeStore from 'ember-data/initializers/store';
import initializeTransforms from 'ember-data/initializers/transforms';
import initializeStoreInjections from 'ember-data/initializers/store-injections';
import initializeDataAdapter from 'ember-data/initializers/data-adapter';
import setupActiveModelContainer from 'activemodel-adapter/setup-container';

export default function setupContainer(container, application) {
  // application is not a required argument. This ensures
  // testing setups can setup a container without booting an
  // entire ember application.

  initializeDataAdapter(container, application);
  initializeTransforms(container, application);
  initializeStoreInjections(container, application);
  initializeStore(container, application);
  setupActiveModelContainer(container, application);
}
