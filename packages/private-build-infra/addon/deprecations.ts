import CURRENT_DEPRECATIONS from './current-deprecations';

function deprecationState(deprecationName: keyof typeof CURRENT_DEPRECATIONS): boolean {
  // if we hit this at runtime and the deprecation exists it is always activated
  return deprecationName in CURRENT_DEPRECATIONS;
}

// deprecations
export const DEPRECATE_CATCH_ALL = deprecationState('DEPRECATE_CATCH_ALL');
export const DEPRECATE_3_12 = deprecationState('DEPRECATE_3_12');
export const DEPRECATE_SAVE_PROMISE_ACCESS = deprecationState('DEPRECATE_SAVE_PROMISE_ACCESS');
