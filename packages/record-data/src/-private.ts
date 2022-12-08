export { default as RecordData } from './-private/record-data';
export { graphFor, peekGraph } from './-private/graph/index';

/**
  This package provides the default cache implementation used
  by `ember-data`. Alternative caches can be provided by
  implementing the associated record-data hooks on the store
  and providing a class that conforms to the current record-data
  interface specification.

  @module @ember-data/record-data
  @main @ember-data/record-data
*/
