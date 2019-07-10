import { Value as JSONValue } from 'json-typescript';
import { Dict } from './utils';

export type Meta = Dict<string, JSONValue>;

/**
 * Serves as a reference to a `Resource` but does not contain
 * any data itself.
 *
 * Used to establish relationship linkages between `Resources` and
 * to address data that may not be available synchronously.
 *
 * [JSON:API Spec](https://jsonapi.org/format/#document-resource-identifier-objects)
 */
export interface ExistingResourceIdentifierObject {
  id: string;
  type: string;

  /**
   * While not officially part of the `JSON:API` spec,
   * `ember-data` allows the use of `lid` as a local
   * identifier for a `Resource`.
   *
   * @recommended It is best to include the lid used when creating
   *   a new resource if this is the response to a new resource creation,
   *   also recommended if this resource type uses secondary indexes.
   *
   * Once a `ResourceIdentifierObject` has been seen by the cache, `lid`
   * should always be present. Only when inbound from the an `API` response
   * is `lid` considered optional.
   *
   * [Identifiers RFC](https://github.com/emberjs/rfcs/blob/master/text/0403-ember-data-identifiers.md#ember-data--identifiers)
   */
  lid?: string;

  /**
   * While valid in the `JSON:API` spec,
   * `ember-data` ignores `meta` on `ResourceIdentifierObjects`
   *
   * @ignored this property goes un-utilized and will be lost
   */
  meta?: Meta;
}

/**
 * Serves as a reference to a resource created on the client
 * but not yet persisted.
 */
export interface NewResourceIdentifierObject {
  /**
   * Resources newly created on the client _may_
   * not have an `id` available to them prior
   * to completion of their first successful `save`.
   *
   * `id` will be `null` in this case.
   */
  id: string | null;
  type: string;

  /**
   * Resources newly created on the client _will always_
   * have an `lid` assigned immediately and available.
   */
  lid: string;
}

export type ResourceIdentifierObject =
  | ExistingResourceIdentifierObject
  | NewResourceIdentifierObject;
