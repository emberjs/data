import { deprecate } from '@ember/debug';

export { default } from '@ember-data/serializer/json';

deprecate(
  'Importing from `ember-data/serializers/json` is deprecated. Please import from `@ember-data/serializer/json` instead.',
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
