// The ResourceBlob is an opaque type that must
// satisfy two constraints.
// (1) it should be possible for the IdentifierCache
// to be able to generate a RecordIdentifier for it
// whether by default or due to configuration.
// (2) it should be in a format expected by the Cache.
// This format is Cache declared.
//
// this Opaqueness allows arbitrary storage of any
// serializable / transferable state including such things
// as Buffers and Strings.
export type ResourceBlob = unknown;
