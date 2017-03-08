import initializeStore from './-private/initializers/store';
import initializeTransforms from './-private/initializers/transforms';
import initializeStoreInjections from './-private/initializers/store-injections';
import initializeDataAdapter from './-private/initializers/data-adapter';

export default function setupContainer(application) {
  initializeDataAdapter(application);
  initializeTransforms(application);
  initializeStoreInjections(application);
  initializeStore(application);
}
