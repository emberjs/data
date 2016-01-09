import initializeStore from 'ember-data/-private/initializers/store';
import initializeTransforms from 'ember-data/-private/initializers/transforms';
import initializeStoreInjections from 'ember-data/-private/initializers/store-injections';
import initializeDataAdapter from 'ember-data/-private/initializers/data-adapter';

export default function setupContainer(application) {
  initializeDataAdapter(application);
  initializeTransforms(application);
  initializeStoreInjections(application);
  initializeStore(application);
}
