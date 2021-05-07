export { default as RecordData } from './record-data';
export { default as Relationship } from './relationships/state/implicit';
export { default as BelongsToRelationship } from './relationships/state/belongs-to';
export { default as ManyRelationship } from './relationships/state/has-many';
export { graphFor, peekGraph } from './graph/index';

/**
  This package provides the default cache implementation used
  by `ember-data`. Alternative caches can be provided by
  implementing the associated record-data hooks on the store
  and providing a class that conforms to the current record-data
  interface specification. 

  @module @ember-data/record-data
  @main @ember-data/record-data
*/
