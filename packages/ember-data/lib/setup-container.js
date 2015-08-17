import initializeStore from 'ember-data/initializers/store';
import initializeTransforms from 'ember-data/initializers/transforms';
import initializeStoreInjections from 'ember-data/initializers/store-injections';
import initializeDataAdapter from 'ember-data/initializers/data-adapter';

export default function setupContainer(application) {
  initializeDataAdapter(application);
  initializeTransforms(application);
  initializeStoreInjections(application);
  initializeStore(application);
}
