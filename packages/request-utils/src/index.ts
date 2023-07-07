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

let CONFIG: BuildURLConfig;

export function setBuildURLConfig(values: BuildURLConfig) {
  CONFIG = values;
}

export interface FindRecordUrlOptions {
  requestType: 'findRecord';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface QueryUrlOptions {
  requestType: 'query';
  identifier: { type: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface QueryRecordUrlOptions {
  requestType: 'queryRecord';
  identifier: { type: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface FindManyUrlOptions {
  requestType: 'findMany';
  identifiers: { type: string; id: string }[];
  resourcePath?: string;
  host?: string;
  namespace?: string;
}
interface FindRelatedCollectionUrlOptions {
  requestType: 'findRelatedCollection';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface FindRelatedResourceUrlOptions {
  requestType: 'findRelatedResource';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface CreateRecordUrlOptions {
  requestType: 'createRecord';
  identifier: { type: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface UpdateRecordUrlOptions {
  requestType: 'updateRecord';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

interface DeleteRecordUrlOptions {
  requestType: 'deleteRecord';
  identifier: { type: string; id: string };
  resourcePath?: string;
  host?: string;
  namespace?: string;
}

export type UrlOptions =
  | FindRecordUrlOptions
  | QueryUrlOptions
  | QueryRecordUrlOptions
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

function resourcePathForType(options: UrlOptions): string {
  return options.requestType === 'findMany' ? options.identifiers[0].type : options.identifier.type;
}

export function buildURL(urlOptions: UrlOptions): string {
  const options = Object.assign(
    {
      host: CONFIG.host,
      namespace: CONFIG.namespace,
    },
    urlOptions
  );
  // prettier-ignore
  const idPath: string | null =
      options.requestType === 'findMany' ? options.identifiers.map((i) => encodeURIComponent(i.id)).join(',')
      : OPERATIONS_WITH_PRIMARY_RECORDS.has(options.requestType) ? encodeURIComponent((options.identifier as { id: string }).id)
      : null;
  const resourcePath = options.resourcePath || resourcePathForType(options);

  assert(
    `You tried to make a ${String(
      (options as { requestType: string }).requestType
    )} request to ${resourcePath} but you have no handler for it.`,
    [
      'findRecord',
      'query',
      'queryRecord',
      'findMany',
      'findRelatedCollection',
      'findRelatedResource',
      'createRecord',
      'updateRecord',
      'deleteRecord',
    ].includes(options.requestType)
  );

  let { host, namespace } = options;

  if (!host || host === '/') {
    host = '/';
  }

  return [host, namespace, resourcePath, idPath].filter(Boolean).join('/');
}
