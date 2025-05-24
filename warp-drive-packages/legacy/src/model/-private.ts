export { type MinimalLegacyRecord } from './-private/model-methods.ts';

export type { ModelStore } from './-private/model.ts';
export { Errors } from './-private/errors.ts';

export { RelatedCollection as ManyArray } from '@warp-drive/core/store/-private';
export { PromiseBelongsTo } from './-private/promise-belongs-to.ts';
export { PromiseManyArray } from './-private/promise-many-array.ts';

// // Used by tests, migration support
export { lookupLegacySupport, LEGACY_SUPPORT } from './-private/legacy-relationships-support.ts';
