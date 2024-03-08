export { attr } from './-private/attr';
export { belongsTo } from './-private/belongs-to';
export { hasMany } from './-private/has-many';
export { Model } from './-private/model';
export { default as Errors } from './-private/errors';

export { default as ManyArray } from './-private/many-array';
export { default as PromiseBelongsTo } from './-private/promise-belongs-to';
export { default as PromiseManyArray } from './-private/promise-many-array';

// // Used by tests, migration support
export { lookupLegacySupport, LEGACY_SUPPORT } from './-private/legacy-relationships-support';
