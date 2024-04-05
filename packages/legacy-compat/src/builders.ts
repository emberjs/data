/**
  Builders for migrating from `store` methods to `store.request`.

  These builders enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
  This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.

  @module @ember-data/legacy-compat/builders
  @main @ember-data/legacy-compat/builders
*/

export { findAllBuilder as findAll } from './builders/find-all';
export type { FindAllBuilderOptions, FindAllRequestInput } from './builders/find-all';

export { findRecordBuilder as findRecord } from './builders/find-record';
export type { FindRecordBuilderOptions, FindRecordRequestInput } from './builders/find-record';

export { queryBuilder as query, queryRecordBuilder as queryRecord } from './builders/query';
export type { QueryBuilderOptions, QueryRecordRequestInput, QueryRequestInput } from './builders/query';

export { saveRecordBuilder as saveRecord } from './builders/save-record';
export type { SaveRecordBuilderOptions, SaveRecordRequestInput } from './builders/save-record';
