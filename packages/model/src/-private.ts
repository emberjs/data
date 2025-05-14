export type { ModelStore } from './-private/model';
export { Errors } from './-private/errors';

export { RelatedCollection as ManyArray } from '@ember-data/store/-private';
export { PromiseBelongsTo } from './-private/promise-belongs-to';
export { PromiseManyArray } from './-private/promise-many-array';

// // Used by tests, migration support
export { lookupLegacySupport, LEGACY_SUPPORT } from './-private/legacy-relationships-support';
