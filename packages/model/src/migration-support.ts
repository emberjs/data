/**
 * This module provides support for migrating away from @ember-data/model
 * to @warp-drive/schema-record.
 *
 * It includes:
 *
 * - A `withDefaults` function to assist in creating a schema in LegacyMode
 * - A `registerDerivations` function to register the derivations necessary to support LegacyMode
 * - A `DelegatingSchemaService` that can be used to provide a schema service that works with both
 *   @ember-data/model and @warp-drive/schema-record simultaneously for migration purposes.
 * - A `WithLegacy` type util that can be used to create a type that includes the legacy
 *   properties and methods of a record.
 *
 * Using LegacyMode features on a SchemaRecord *requires* the use of these derivations and schema
 * additions. LegacyMode is not intended to be a long-term solution, but rather a stepping stone
 * to assist in more rapidly adopting modern WarpDrive features.
 *
 * @module
 */
export * from '@warp-drive/legacy/model/migration-support';
