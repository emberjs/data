import type { DSModel } from './ds-model';
import type { Dict } from './utils';
/**
  @module @ember-data/store
*/

/*
  A `Record` is the result of the store instantiating a class to present data for a resource to the UI.

  Historically in `ember-data` this meant that it was the result of calling `ModelFactory.create()` to
  gain instance to a class built upon `@ember-data/model`. However, as we go forward into a future in which
  model instances (aka `Records`) are completely user supplied and opaque to the internals, we need a type
  through which to communicate what is valid.

  The type belows allows for anything extending object.
*/

export type RecordInstance = DSModel | Dict<unknown>;
