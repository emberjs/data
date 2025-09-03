/**
 * This module provides utilities for working with [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html#convention-over-configuration-in-active-record) APIs with ***Warp*Drive**
 *
 * ## Usage
 *
 * Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
 * They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.
 *
 * For instance, to fetch a resource from your API
 *
 * ::: code-group
 *
 * ```ts [input.ts]
 * import { findRecord } from '@warp-drive/utilities/active-record';
 *
 * const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });
 * ```
 *
 * ```ts [output.ts]
 * {
 *   url: 'https://api.example.com/v1/ember_developers/1?include=friends,pets',
 *   method: 'GET',
 *   headers: <Headers>, // 'Content-Type': 'application/json;charset=utf-8'
 *   op: 'findRecord';
 *   records: [{ type: 'ember-developer', id: '1' }]
 * }
 * ```
 *
 * :::
 *
 * Request builder output may be used with either {@link RequestManager.request} or {@link Store.request}.
 *
 * ```ts
 * const data = await store.request(options);
 * ```
 *
 * ### Features
 *
 * - URLs are stable. The same query will produce the same URL every time, even if the order of keys in
 *   the query or values in an array changes.
 * - URLs follow the most common ActiveRecord format (underscored pluralized resource types).
 *
 * @module
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RequestManager, Store } from '@warp-drive/core';

export { findRecord } from './-private/active-record/find-record';
export { query } from './-private/active-record/query';
export { deleteRecord, createRecord, updateRecord } from './-private/active-record/save-record';
