import { deprecate } from '@ember/debug';

export { default } from 'ember-data/store';

deprecate(
  "You are relying on ember-data auto-magically installing the store service. Use `export { default } from 'ember-data/store';` in app/services/store.js instead",
  false,
  {
    id: 'ember-data:deprecate-legacy-imports',
    for: 'ember-data',
    until: '6.0',
    since: {
      enabled: '5.2',
      available: '4.13',
    },
  }
);
