import type { StableRecordIdentifier } from './identifier';
import type { QueryParamsSerializationOptions } from './params';
import type { Includes, TypedRecordInstance, TypeFromInstanceOrString } from './record';
import type { CacheOptions, ImmutableHeaders } from './request';
import type { ResourceIdentifierObject } from './spec/json-api-raw';
import type { RequestSignature } from './symbols';

interface RequestOptions<T, RT> {
  url: string;
  headers: Headers;
  cacheOptions: CacheOptions<T>;
  /**
   * Data that a handler might convert
   * into the body of the request.
   *
   * @typedoc
   */
  data?: unknown;
  /**
   * Options that a handler might use to process the request.
   *
   * @typedoc
   */
  options?: Record<string, unknown>;
  /**
   * Records involved in the request. If cacheOptions.records is present
   * this will be ignored. cacheOptions.records is preferred.
   *
   * @deprecated
   * @typedoc
   */
  records?: ResourceIdentifierObject<TypeFromInstanceOrString<T>>[];
  [RequestSignature]?: RT;
}

export interface FindRecordRequestOptions<T = unknown, RT = unknown> extends RequestOptions<T, RT> {
  method: 'GET';
  op: 'findRecord';
}

export interface QueryRequestOptions<T = unknown, RT = unknown> extends RequestOptions<T, RT> {
  method: 'GET';
  op: 'query';
}

export interface PostQueryRequestOptions<T = unknown, RT = unknown> extends RequestOptions<T, RT> {
  method: 'POST' | 'QUERY';
  op: 'query';
  body?: string | BodyInit | FormData;
  cacheOptions: CacheOptions<T> & { key: string };
}

export interface DeleteRequestOptions<T = unknown, RT = unknown> extends RequestOptions<T, RT> {
  method: 'DELETE';
  op: 'deleteRecord';
  body?: string | BodyInit | FormData;
}

export interface UpdateRequestOptions<T = unknown, RT = unknown> extends RequestOptions<T, RT> {
  method: 'PATCH' | 'PUT';
  op: 'updateRecord';
  body?: string | BodyInit | FormData;
}

export interface CreateRequestOptions<T = unknown, RT = unknown> extends RequestOptions<T, RT> {
  method: 'POST';
  op: 'createRecord';
  body?: string | BodyInit | FormData;
}

type ImmutableRequest<T> = Readonly<T> & {
  readonly headers: ImmutableHeaders;
  readonly records: [StableRecordIdentifier];
};

export type ImmutableDeleteRequestOptions = ImmutableRequest<DeleteRequestOptions>;
export type ImmutableUpdateRequestOptions = ImmutableRequest<UpdateRequestOptions>;
export type ImmutableCreateRequestOptions = ImmutableRequest<CreateRequestOptions>;

export type RemotelyAccessibleIdentifier<T extends string = string> = {
  id: string;
  type: T;
  lid?: string;
};

export type ConstrainedRequestOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
};

export type FindRecordOptions<T = unknown> = ConstrainedRequestOptions & {
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
};
