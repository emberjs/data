import { deprecate } from '@ember/debug';

import { BooleanTransform } from '@ember-data/serializer/transform';

export default class DeprecatedBooleanTransform extends BooleanTransform {
  constructor(...args) {
    super(...args);
    deprecate(
      "You are relying on ember-data auto-magically installing the BooleanTransform. Use `export { BooleanTransform as default } from '@ember-data/serializer/transform';` in app/transforms/boolean.js instead",
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
