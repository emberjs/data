import { deprecate } from '@ember/debug';

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
} from '@ember-data/adapter/error';

deprecate(
  'Importing from `ember-data/adapters/errors` is deprecated. Please import from `@ember-data/adapter` instead.',
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
