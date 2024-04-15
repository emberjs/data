import type { Config } from './legacy-store-method.js';
import { arrayTypeParam, singularTypeParam, validateForFindRecord } from './legacy-store-method.js';

const LegacyCompatBuildersSourceValue = '@ember-data/legacy-compat/builders';
export const CONFIGS = new Set([
  {
    importedName: 'findAll' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
    transformOptions: {
      extractBuilderTypeParams: singularTypeParam,
      extractRequestTypeParams: arrayTypeParam,
    },
  } satisfies Config,
  {
    importedName: 'findRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
    transformOptions: {
      extractBuilderTypeParams: singularTypeParam,
      extractRequestTypeParams: singularTypeParam,
      validate: validateForFindRecord,
    },
  } satisfies Config,
  {
    importedName: 'query' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
    transformOptions: {
      extractBuilderTypeParams: singularTypeParam,
      extractRequestTypeParams: arrayTypeParam,
    },
  } satisfies Config,
  {
    importedName: 'queryRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
    transformOptions: {
      extractBuilderTypeParams: singularTypeParam,
      extractRequestTypeParams: singularTypeParam,
    },
  } satisfies Config,
  {
    importedName: 'saveRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
    transformOptions: {
      extractBuilderTypeParams: () => null,
      extractRequestTypeParams: singularTypeParam,
    },
  } satisfies Config,
]);
export type CONFIGS = typeof CONFIGS;
