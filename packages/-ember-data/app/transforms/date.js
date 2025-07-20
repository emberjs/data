import { deprecate } from '@ember/debug';

import { DateTransform } from '@ember-data/serializer/transform';

export default class DeprecatedDateTransform extends DateTransform {
  constructor(...args) {
    super(...args);
    deprecate(
      "You are relying on ember-data auto-magically installing the DateTransform. Use `export { DateTransform as default } from '@ember-data/serializer/transform';` in app/transforms/date.js instead",
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
  }
}
