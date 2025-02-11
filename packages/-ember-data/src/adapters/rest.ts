import { deprecate } from '@ember/debug';

import { DISABLE_6X_DEPRECATIONS } from '@warp-drive/build-config/deprecations';

export { default } from '@ember-data/adapter/rest';

deprecate(
  'Importing from `ember-data/adapters/rest` is deprecated. Please import from `@ember-data/adapter/rest` instead.',
  /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
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
