import { assert } from '@ember/debug';

/**
  @module @ember-data/request-utils
*/

// prevents the final constructed object from needing to add
// host and namespace which are provided by the final consuming
// class to the prototype which can result in overwrite errors

interface BuildURLConfig {
  host: string | null;
  namespace: string | null;
}

let CONFIG: BuildURLConfig = {
  host: '',
  namespace: '',
};

export function setBuildURLConfig(values: BuildURLConfig) {
  CONFIG = values;
}

export interface FindRecordUrlOptions {
  op: 'findRecord';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export interface QueryUrlOptions {
  op: 'query';
  identifier: { type: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export interface FindManyUrlOptions {
  op: 'findMany';
  identifiers: { type: string; id: string }[];
  resourcePath?: string;
  host?: string;
  namespace?: string;
}
export interface FindRelatedCollectionUrlOptions {
  op: 'findRelatedCollection';
  identifier: { type: string; id: string };
  fieldPath: string;
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export interface FindRelatedResourceUrlOptions {
  op: 'findRelatedResource';
  identifier: { type: string; id: string };
  fieldPath: string;
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export interface CreateRecordUrlOptions {
  op: 'createRecord';
  identifier: { type: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export interface UpdateRecordUrlOptions {
  op: 'updateRecord';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export interface DeleteRecordUrlOptions {
  op: 'deleteRecord';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export type UrlOptions =
  | FindRecordUrlOptions
  | QueryUrlOptions
  | FindManyUrlOptions
  | FindRelatedCollectionUrlOptions
  | FindRelatedResourceUrlOptions
  | CreateRecordUrlOptions
  | UpdateRecordUrlOptions
  | DeleteRecordUrlOptions;

const OPERATIONS_WITH_PRIMARY_RECORDS = new Set([
  'findRecord',
  'findRelatedResource',
  'findRelatedCollection',
  'updateRecord',
  'deleteRecord',
]);

function isOperationWithPrimaryRecord(
  options: UrlOptions
): options is
  | FindRecordUrlOptions
  | FindRelatedCollectionUrlOptions
  | FindRelatedResourceUrlOptions
  | UpdateRecordUrlOptions
  | DeleteRecordUrlOptions {
  return OPERATIONS_WITH_PRIMARY_RECORDS.has(options.op);
}

function resourcePathForType(options: UrlOptions): string {
  return options.op === 'findMany' ? options.identifiers[0].type : options.identifier.type;
}

export function buildBaseURL(urlOptions: UrlOptions): string {
  const options = Object.assign(
    {
      host: CONFIG.host,
      namespace: CONFIG.namespace,
    },
    urlOptions
  );
  assert(`You must pass an \`op\` to buildURL.`, options.op);

  // prettier-ignore
  const idPath: string | null =
      isOperationWithPrimaryRecord(options) ? encodeURIComponent(options.identifier.id)
      : null;
  const resourcePath = options.resourcePath || resourcePathForType(options);
  const { host, namespace } = options;
  const fieldPath = 'fieldPath' in options ? options.fieldPath : '';

  assert(
    `You tried to make a ${String(
      (options as { op: string }).op
    )} request to ${resourcePath} but you have no handler for it.`,
    [
      'findRecord',
      'query',
      'findMany',
      'findRelatedCollection',
      'findRelatedResource',
      'createRecord',
      'updateRecord',
      'deleteRecord',
    ].includes(options.op)
  );

  const url = [host === '/' ? '' : host, namespace, resourcePath, idPath, fieldPath].filter(Boolean).join('/');
  return host ? url : `/${url}`;
}

type SerializablePrimitive = string | number | boolean | null;
type Serializable = SerializablePrimitive | SerializablePrimitive[];
export type QueryParamsSerializationOptions = {
  arrayFormat?: 'bracket' | 'indices' | 'repeat' | 'comma';
};
export type QueryParamsSource = Record<string, Serializable> | URLSearchParams;

const DEFAULT_QUERY_PARAMS_SERIALIZATION_OPTIONS: QueryParamsSerializationOptions = {
  arrayFormat: 'comma',
};

function handleInclude(include: string | string[]): string[] {
  assert(
    `Expected include to be a string or array, got ${typeof include}`,
    typeof include === 'string' || Array.isArray(include)
  );
  return typeof include === 'string' ? include.split(',') : include;
}

export function buildQueryParams(params: QueryParamsSource, options?: QueryParamsSerializationOptions): string {
  options = Object.assign({}, DEFAULT_QUERY_PARAMS_SERIALIZATION_OPTIONS, options);
  const paramsIsObject = !(params instanceof URLSearchParams);
  const urlParams = new URLSearchParams();
  const dictionaryParams: Record<string, Serializable> = paramsIsObject ? params : {};

  if (!paramsIsObject) {
    params.forEach((value, key) => {
      const hasExisting = key in dictionaryParams;
      if (!hasExisting) {
        dictionaryParams[key] = value;
      } else {
        const existingValue = dictionaryParams[key];
        if (Array.isArray(existingValue)) {
          existingValue.push(value);
        } else {
          dictionaryParams[key] = [existingValue, value];
        }
      }
    });
  }

  if ('include' in dictionaryParams) {
    dictionaryParams.include = handleInclude(dictionaryParams.include as string | string[]);
  }

  const sortedKeys = Object.keys(dictionaryParams).sort();
  sortedKeys.forEach((key) => {
    const value = dictionaryParams[key];
    if (Array.isArray(value)) {
      value.sort();
      switch (options!.arrayFormat) {
        case 'indices':
          value.forEach((v, i) => {
            urlParams.append(`${key}[${i}]`, String(v));
          });
          return;
        case 'bracket':
          value.forEach((v) => {
            urlParams.append(`${key}[]`, String(v));
          });
          return;
        case 'repeat':
          value.forEach((v) => {
            urlParams.append(key, String(v));
          });
          return;
        case 'comma':
        default:
          urlParams.append(key, value.join(','));
          return;
      }
    } else {
      urlParams.append(key, String(value));
    }
  });

  return urlParams.toString();
}
