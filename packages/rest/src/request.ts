/**
 * Request Builders ready to go for use with `store.request()`
 * and most conventional REST APIs.
 *
 * Resource types are pluralized and camelized for the url.
 *
 * @module @ember-data/rest/request
 * @main @ember-data/rest/request
 * @public
 */
export { findRecord } from './-private/builders/find-record';
export { query } from './-private/builders/query';
export { deleteRecord, createRecord, updateRecord } from './-private/builders/save-record';
