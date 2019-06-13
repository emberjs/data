import { Value as JSONValue } from 'json-typescript';

export type Dict<K extends string, V> = { [KK in K]: V };
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
export interface ResourceIdentifierObject {
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
 * Represents the data for a unique cacheable entity.
 *
 * [JSON:API Spec](https://jsonapi.org/format/#document-resource-objects)
 */
export interface Resource {
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
   * [Identifiers RFC](https://github.com/emberjs/rfcs/blob/master/text/0403-ember-data-identifiers.md#ember-data--identifiers)
   */
  lid?: string;

  attributes?: Dict<string, JSONValue>;
  relationships?: Dict<string, any>;

  /**
   * While valid in the `JSON:API` spec,
   * `ember-data` currently ignores `links`
   * on `Resources`
   *
   * @ignored this property goes un-utilized currently
   *
   * [links & meta RFC](https://github.com/emberjs/rfcs/blob/master/text/0332-ember-data-record-links-and-meta.md#ember-data-record-links--meta)
   */
  links?: any;

  /**
   * While valid in the `JSON:API` spec,
   * `ember-data` currently ignores `links`
   * on `Resources`
   *
   * @ignored this property goes un-utilized currently
   *
   * [links & meta RFC](https://github.com/emberjs/rfcs/blob/master/text/0332-ember-data-record-links-and-meta.md#ember-data-record-links--meta)
   */
  meta?: Meta;
}

/**
 * Document containing an API response for
 * a collection of primary `Resources`
 *
 * [JSON:API Spec](https://jsonapi.org/format/#document-structure)
 */
interface CollectionDocument {
  /**
   * While `JSON:API` allows for `Documents` to have a `data`
   * member specifying `ResourceIdentifierObjects`, `ember-data`
   * is more restrictive and only allows `Resources`;
   */
  data: Resource[];
  included?: Resource[];
  meta?: Meta;
  links?: any;
}

/**
 * Document containing an API response for
 * a collection of primary `Resources`
 *
 * [JSON:API Spec](https://jsonapi.org/format/#document-structure)
 */
interface ResourceDocument {
  /**
   * While `JSON:API` allows for `Documents` to have a `data`
   * member specifying a `ResourceIdentifierObject`, `ember-data`
   * is more restrictive and only allows a `Resource`;
   */
  data: Resource | null;
  included?: Resource[];
  meta?: Meta;
  links?: any;
}

type DocumentWithData = ResourceDocument | CollectionDocument;

interface DocumentWithErrors {
  errors: any[];
  meta?: Meta;
  links?: any;
}

/**
 * While `JSON:API` supports `Documents` having one of `meta`
 * `errors` or `data` as the only member, `ember-data`
 * does not support "`meta` only" documents.
 *
 * @deprecated "`meta` only" `JSON:API` `Documents` are unsupported
 */
interface DocumentWithMeta {
  meta: Meta;
}

export type Document = DocumentWithData | DocumentWithErrors | DocumentWithMeta;
