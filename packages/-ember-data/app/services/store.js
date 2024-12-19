import { deprecate } from '@ember/debug';

export { default } from 'ember-data/store';
import { DISABLE_6X_DEPRECATIONS } from '@warp-drive/build-config/deprecations';

deprecate(
  "You are relying on ember-data auto-magically installing the store service. Use `export { default } from 'ember-data/store';` in app/services/store.js instead",
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
