import { deprecate } from '@ember/debug';

export { default } from '@ember-data/adapter/json-api';

deprecate(
  'Importing from `ember-data/adapters/json-api` is deprecated. Please import from `@ember-data/adapter/json-api` instead.',
  false,
  {
    id: 'ember-data:deprecate-legacy-imports',
    for: 'ember-data',
    until: '6.0',
    since: {
      enabled: '5.2',
      available: '5.2',
    },
  }
);
