import type { Value as JSONValue } from 'json-typescript';

import type { Dict } from './utils';

/**
  @module @ember-data/store
*/

export type Meta = Dict<JSONValue>;
export type LinkObject = { href: string; meta?: Dict<JSONValue> };
export type Link = string | LinkObject;
export interface Links {
  related?: Link;
  self?: Link;
}
export interface PaginationLinks extends Links {
  first?: Link | null;
  last?: Link | null;
  prev?: Link | null;
  next?: Link | null;
}

/**
 * Serves as a reference to a `Resource` but does not contain
 * any data itself.
 *
 * Used to establish relationship linkages between `Resources` and
 * to address data that may not be available synchronously.
 *
 * [JSON:API Spec](https://jsonapi.org/format/#document-resource-identifier-objects)
 * @internal
 */
export interface ExistingResourceIdentifierObject<K extends string = string> {
  id: string;
  type: K;

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
   * @internal
   */
  lid?: string;

  /**
   * While valid in the `JSON:API` spec,
   * `ember-data` ignores `meta` on `ResourceIdentifierObjects`
   *
   * @ignored this property goes un-utilized and will be lost
   * @internal
   */
  meta?: Meta;
}

/**
 * Serves as a reference to a resource created on the client
 * but not yet persisted.
 *
 * @internal
 */
export interface NewResourceIdentifierObject<K extends string = string> {
  /**
   * Resources newly created on the client _may_
   * not have an `id` available to them prior
   * to completion of their first successful `save`.
   *
   * `id` will be `null` in this case.
   *
   * @internal
   */
  id: string | null;
  type: K;

  /**
   * Resources newly created on the client _will always_
   * have an `lid` assigned immediately and available.
   * @internal
   */
  lid: string;
}

export interface ResourceIdentifier {
  lid: string;
}

export type ResourceIdentifierObject<K extends string = string> =
  | ResourceIdentifier
  | ExistingResourceIdentifierObject<K>
  | NewResourceIdentifierObject<K>;

// TODO disallow NewResource, make narrowable
export interface SingleResourceRelationship<T extends string = string> {
  data?: ResourceIdentifierObject<T> | null;
  meta?: Dict<JSONValue>;
  links?: Links;
}

export interface CollectionResourceRelationship<K extends string = string> {
  data?: ResourceIdentifierObject<K>[];
  meta?: Dict<JSONValue>;
  links?: PaginationLinks;
}

/**
 * Contains the data for an existing resource in JSON:API format
 * @internal
 */
export interface ExistingResourceObject<K extends string = string> extends ExistingResourceIdentifierObject<K> {
  meta?: Dict<JSONValue>;
  attributes?: Dict<JSONValue>;
  relationships?: Dict<SingleResourceRelationship<K> | CollectionResourceRelationship<K>>;
  links?: Links;
}

interface Document<K extends string> {
  meta?: Dict<JSONValue>;
  included?: ExistingResourceObject<K>[];
  jsonapi?: Dict<JSONValue>;
  links?: Dict<string | JSONValue>;
  errors?: JSONValue[];
}

export interface EmptyResourceDocument<K extends string = string> extends Document<K> {
  data: null;
}

// TODO pass in the Registry here for included purposes
export interface SingleResourceDocument<P extends string = string, K extends string = string> extends Document<K> {
  data: ExistingResourceObject<P>;
}

export interface CollectionResourceDocument<P extends string = string, K extends string = string> extends Document<K> {
  data: ExistingResourceObject<P>[];
}

export type JsonApiDocument<P extends string = string, K extends string = string> =
  | EmptyResourceDocument<K>
  | SingleResourceDocument<P, K>
  | CollectionResourceDocument<P, K>;
