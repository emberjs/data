import type Application from '@ember/application';
import { deprecate } from '@ember/debug';

function initializeStore(application: Application) {
  application.registerOptionsForType('serializer', { singleton: false });
  application.registerOptionsForType('adapter', { singleton: false });
}

export default function setupContainer(application: Application) {
  initializeStore(application);
}

deprecate('Importing from `ember-data/setup-container` is deprecated without replacement', false, {
  id: 'ember-data:deprecate-legacy-imports',
  for: 'ember-data',
  until: '6.0',
  since: {
    enabled: '5.2',
    available: '5.2',
  },
});
