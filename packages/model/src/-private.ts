export { default as attr } from './-private/attr';
export { default as belongsTo } from './-private/belongs-to';
export { default as hasMany } from './-private/has-many';
export { default as Model } from './-private/model';
export { default as Errors } from './-private/errors';

export { default as ManyArray } from './-private/many-array';
export { default as PromiseBelongsTo } from './-private/promise-belongs-to';
export { default as PromiseManyArray } from './-private/promise-many-array';
// We can't re-export from here, becaues it creates a module cycle
// (which prevents vite and sometimes webpack from loading)
// - @ember-data/model/-private
//   -> @ember-data/model/has-many-abc123 (private module from rollup)
//     -> @ember-data/store/-private
//       -> @ember-data/store/index-abc123 (private module from rollup)
//         -> importSync of @ember-data/model/-private
//export { default as _modelForMixin } from './-private/model-for-mixin';

// // Used by tests
export { default as diffArray } from './-private/diff-array';
export { LEGACY_SUPPORT } from './-private/model';
