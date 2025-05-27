/**
  In WarpDrive, a "record instance" is a class instance used to present the data
  for a single resource, transforming the resource's cached raw data into a form
  that is useful for the application.

  Since every application's needs are different, WarpDrive does not assume to know
  what the shape of the record instance should be. Instead, it provides a way to
  define the record instance's via the `instantiateRecord` hook on the store.

  Thus for most purposes the `RecordInstance` type is "opaque" to WarpDrive, and
  should be treated as "unknown" by the library.

  Wherever possible, if typing an API that is consumer facing, instead of using
  OpaqueRecordInstance, we should prefer to use a generic and check if the generic
  extends `TypedRecordInstance`. This allows consumers to define their own record
  instance types and not only have their types flow through WarpDrive APIs, but
  also allows WarpDrive to provide typechecking and intellisense for the record
  based on a special symbol prsent on record instances that implement the
  `TypedRecordInstance` interface.

  @internal
*/
export type OpaqueRecordInstance = unknown;
