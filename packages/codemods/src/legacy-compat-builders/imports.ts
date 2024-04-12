import type { ImportInfos } from '../utils/imports.js';

const LegacyCompatBuildersSourceValue = '@ember-data/legacy-compat/builders';
export const IMPORT_INFOS = new Set([
  {
    importedName: 'findAll' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  },
  {
    importedName: 'findRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  },
  {
    importedName: 'query' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  },
  {
    importedName: 'queryRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  },
  {
    importedName: 'saveRecord' as const,
    sourceValue: LegacyCompatBuildersSourceValue,
  },
]) satisfies ImportInfos;
export type IMPORT_INFOS = typeof IMPORT_INFOS;
export type ImportName = keyof typeof IMPORT_INFOS;
