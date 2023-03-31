import type Application from '@ember/application';

function initializeStore(application: Application) {
  application.registerOptionsForType('serializer', { singleton: false });
  application.registerOptionsForType('adapter', { singleton: false });
}

export default function setupContainer(application: Application) {
  initializeStore(application);
}
