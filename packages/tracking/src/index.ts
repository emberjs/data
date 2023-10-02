export { transact, memoTransact, untracked } from './-private';

// temporary so we can remove the glimmer and ember imports elsewhere
export { dependentKeyCompat as compat } from '@ember/object/compat';
export { cached, tracked as signal } from '@glimmer/tracking';
