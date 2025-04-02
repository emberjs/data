import * as DEPRECATION_VERSIONS from './deprecation-versions';
import * as DEPRECATION_FLAGS from './deprecations';

function expectKeyMatch<T extends Record<string, unknown>, K extends Record<keyof T, unknown>>(
  actual: T,
  expected: K
): void {}

// If this is failing, it means that the exported deprecation flags in
// ./deprecations.ts are out of sync with the version flags in
// ./deprecation-versions.ts. This is likely because a new deprecation flag was
// added or removed without updating the other file.
expectKeyMatch(DEPRECATION_VERSIONS, DEPRECATION_FLAGS);
expectKeyMatch(DEPRECATION_FLAGS, DEPRECATION_VERSIONS);
