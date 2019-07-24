/**
  @module @ember-data/store
*/

/*
  A `Record` is the result of the store instantiating a class to present data for a resource to the UI.

  Historically in `ember-data` this meant that it was the result of calling `_modelFactoryFor.create()` to
  gain instance to a class built upon `@ember-data/model`. However, as we go forward into a future in which
  model instances (aka `Records`) are completely user supplied and opaque to the internals, we need a type
  through which to communicate what is valid.

  The type belows allows for either a class instance, or an object, but not primitive values or functions.
*/
type Primitive = string | number | boolean | null;
interface Object {
  [member: string]: Value | undefined | ((...args: any[]) => any);
}
interface Arr extends Array<Object | Arr | undefined> {}

type Value = Primitive | Object | Arr;

export type Record = Object;
