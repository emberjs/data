export { attr } from './-private/attr';
export { belongsTo } from './-private/belongs-to';
export { hasMany } from './-private/has-many';
export { Model } from './-private/model';
export type { ModelStore } from './-private/model';
export { Errors } from './-private/errors';

export { RelatedCollection as ManyArray } from './-private/many-array';
export { PromiseBelongsTo } from './-private/promise-belongs-to';
export { PromiseManyArray } from './-private/promise-many-array';

// // Used by tests, migration support
export { lookupLegacySupport, LEGACY_SUPPORT } from './-private/legacy-relationships-support';
