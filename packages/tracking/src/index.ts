export { transact, memoTransact, untracked } from './-private';

// temporary so we can remove the glimmer and ember imports elsewhere
// eslint-disable-next-line no-restricted-imports
export { dependentKeyCompat as compat } from '@ember/object/compat';
// eslint-disable-next-line no-restricted-imports
export { cached } from '@glimmer/tracking';
