import { modelForMixin } from './system/model-for-mixin';

export { default as attr } from './attr';
export { default as belongsTo } from './belongs-to';
export { default as hasMany } from './has-many';
export { default as Model } from './model';
export { default as Errors } from './errors';

require('@ember-data/store').default.prototype._modelForMixin = modelForMixin;
