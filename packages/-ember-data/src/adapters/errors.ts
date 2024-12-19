import { deprecate } from '@ember/debug';

import { DISABLE_6X_DEPRECATIONS } from '@warp-drive/build-config/deprecations';

export {
  AbortError,
  default as AdapterError,
  ConflictError,
  ForbiddenError,
  InvalidError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
  errorsArrayToHash,
  errorsHashToArray,
} from '@ember-data/adapter/error';

deprecate(
  'Importing from `ember-data/adapters/errors` is deprecated. Please import from `@ember-data/adapter` instead.',
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
