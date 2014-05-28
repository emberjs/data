import initializeStore from './initializers/store';
import initializeTransforms from './initializers/transforms';
import initializeStoreInjections from './initializers/store_injections';
import initializeDataAdapter from './initializers/data_adapter';
import setupActiveModelContainer from '../../../activemodel-adapter/lib/setup-container';

export default function setupContainer(container, application){
  // application is not a required argument. This ensures
  // testing setups can setup a container without booting an
  // entire ember application.

  initializeDataAdapter(container, application);
  initializeTransforms(container, application);
  initializeStoreInjections(container, application);
  initializeStore(container, application);
  setupActiveModelContainer(container, application);
};
