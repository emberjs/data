import { deprecate } from '@ember/debug';

export { default } from '@ember-data/serializer/rest';

deprecate(
  'Importing from `ember-data/serializers/rest` is deprecated. Please import from `@ember-data/serializer/rest` instead.',
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
