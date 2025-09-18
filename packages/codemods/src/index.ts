import { default as legacyCompatBuilders } from './legacy-compat-builders/index.js';
import { log } from './legacy-compat-builders/log.js';
import { default as modelToSchema } from './schema-migration/model-to-schema-index.js';
import { default as mixinToSchema } from './schema-migration/mixin-to-schema-index.js';
import { default as migrateToSchema } from './schema-migration/migrate-to-schema-index.js';

// exports for testing
export const Codemods = {
  'legacy-compat-builders': legacyCompatBuilders,
  'model-to-schema': modelToSchema,
  'mixin-to-schema': mixinToSchema,
  'migrate-to-schema': migrateToSchema,
};
export type Codemods = typeof Codemods;

// exports for testing
export const Logs = {
  'legacy-compat-builders': log,
};
