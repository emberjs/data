import type { ImportInfo } from '../utils/imports.js';
import type { Config } from './legacy-store-method.js';
import { singularTypeParam, validateForFindRecord } from './legacy-store-method.js';

const LegacyCompatBuildersSourceValue = '@ember-data/legacy-compat/builders';
export const IMPORT_INFOS = [
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
];
type IMPORT_INFOS = typeof IMPORT_INFOS;

export type LegacyStoreMethod = IMPORT_INFOS[number]['importedName'];

export const CONFIGS: Map<string, Config> = new Map([
  [
    'findAll',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
      },
    },
  ],
  [
    'findRecord',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
        validate: validateForFindRecord,
      },
    },
  ],
  [
    'query',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
      },
    },
  ],
  [
    'queryRecord',
    {
      transformOptions: {
        extractBuilderTypeParams: singularTypeParam,
      },
    },
  ],
  [
    'saveRecord',
    {
      transformOptions: {
        extractBuilderTypeParams: () => null,
      },
    },
  ],
]);
export type CONFIGS = typeof CONFIGS;
