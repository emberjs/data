/*
  @module @warp-drive/core-types
*/
import type { ArrayValue, ObjectValue } from '../json/raw';

export type Meta = ObjectValue;
export type LinkObject = { href: string; meta?: Meta };
export type Link = string | LinkObject;
export interface Links {
  related?: Link | null;
  self?: Link | null;
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
export interface ExistingResourceIdentifierObject<T extends string = string> {
  id: string;
  type: T;

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
   * [Identifiers RFC](https://github.com/emberjs/rfcs/blob/main/text/0403-ember-data-identifiers.md#ember-data--identifiers)
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
export interface NewResourceIdentifierObject<T extends string = string> {
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
  type: T;

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

export type ResourceIdentifierObject<T extends string = string> =
  | ResourceIdentifier
  | ExistingResourceIdentifierObject<T>
  | NewResourceIdentifierObject<T>;

// TODO disallow NewResource, make narrowable
export interface SingleResourceRelationship {
  data?: ExistingResourceIdentifierObject | NewResourceIdentifierObject | null;
  meta?: Meta;
  links?: Links;
}

export interface CollectionResourceRelationship {
  data?: Array<ExistingResourceIdentifierObject | NewResourceIdentifierObject>;
  meta?: Meta;
  links?: PaginationLinks;
}

/**
 * Contains the data for an existing resource in JSON:API format
 * @internal
 */
export interface ExistingResourceObject<T extends string = string> extends ExistingResourceIdentifierObject<T> {
  meta?: Meta;
  attributes?: ObjectValue;
  relationships?: Record<string, SingleResourceRelationship | CollectionResourceRelationship>;
  links?: Links;
}

interface Document {
  lid?: string;
  meta?: Meta;
  included?: ExistingResourceObject[];
  jsonapi?: ObjectValue;
  links?: Links | PaginationLinks;
  errors?: ArrayValue;
}

export interface EmptyResourceDocument extends Document {
  data: null;
}

export interface SingleResourceDocument<T extends string = string> extends Document {
  data: ExistingResourceObject<T>;
}

export interface CollectionResourceDocument<T extends string = string> extends Document {
  data: ExistingResourceObject<T>[];
}

/**
 * A (RAW) JSON:API Formatted Document.
 *
 * These documents should follow the JSON:API spec but do not
 * have the same level of guarantees as their `spec` counterparts.
 *
 * @internal
 */
export type JsonApiDocument<T extends string = string> =
  | EmptyResourceDocument
  | SingleResourceDocument<T>
  | CollectionResourceDocument<T>;
