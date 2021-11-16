import Store from '@ember-data/store';

function initializeStore(application) {
  application.registerOptionsForType('serializer', { singleton: false });
  application.registerOptionsForType('adapter', { singleton: false });

  if (!application.hasRegistration('service:store')) {
    application.register('service:store', Store);
  }
}

export default function setupContainer(application) {
  initializeStore(application);
}
