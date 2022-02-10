import CURRENT_DEPRECATIONS from './current-deprecations';

function deprecationState(deprecationName: keyof typeof CURRENT_DEPRECATIONS): boolean {
  // if we hit this at runtime and the deprecation exists it is always activated
  return deprecationName in CURRENT_DEPRECATIONS;
}

// deprecations
export const DEPRECATE_CATCH_ALL = deprecationState('DEPRECATE_CATCH_ALL');
