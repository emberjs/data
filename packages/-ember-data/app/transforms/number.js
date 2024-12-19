import { deprecate } from '@ember/debug';

export { NumberTransform as default } from '@ember-data/serializer/transform';

deprecate(
  "You are relying on ember-data auto-magically installing the NumberTransform. Use `export { NumberTransform as default } from '@ember-data/serializer/transform';` in app/transforms/number.js instead",
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
