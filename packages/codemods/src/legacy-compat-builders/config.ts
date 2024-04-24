import type { ValueOfSet } from '../../utils/types.js';
import type { ImportInfo } from '../utils/imports.js';
import type { Config } from './legacy-store-method.js';
import { arrayTypeParam, singularTypeParam, validateForFindRecord } from './legacy-store-method.js';

const LegacyCompatBuildersSourceValue = '@ember-data/legacy-compat/builders';
export const IMPORT_INFOS = new Set([
  {
    importedName: 'findAll' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  } satisfies ImportInfo,
  {
    importedName: 'findRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  } satisfies ImportInfo,
  {
    importedName: 'query' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  } satisfies ImportInfo,
  {
    importedName: 'queryRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  } satisfies ImportInfo,
  {
    importedName: 'saveRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  } satisfies ImportInfo,
]);
export type IMPORT_INFOS = typeof IMPORT_INFOS;

export type LegacyStoreMethod = ValueOfSet<IMPORT_INFOS>['importedName'];

export const CONFIGS: Map<string, Config> = new Map([
  [
    'findAll',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
        extractRequestTypeParams: arrayTypeParam,
      },
    },
  ],
  [
    'findRecord',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
        extractRequestTypeParams: singularTypeParam,
        validate: validateForFindRecord,
      },
    },
  ],
  [
    'query',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
        extractRequestTypeParams: arrayTypeParam,
      },
    },
  ],
  [
    'queryRecord',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
        extractRequestTypeParams: singularTypeParam,
      },
    },
  ],
  [
    'saveRecord',
    {
      transformOptions: {
        extractBuilderTypeParams: () => null,
        extractRequestTypeParams: singularTypeParam,
      },
    },
  ],
]);
export type CONFIGS = typeof CONFIGS;
