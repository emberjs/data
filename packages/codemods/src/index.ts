import { default as legacyCompatBuilders } from './legacy-compat-builders/index.js';
import { log } from './legacy-compat-builders/log.js';
import { log as migrateToSchemaLog } from './schema-migration/log.js';
import migrateToSchema from './schema-migration/migrate-to-schema.js';

// exports for testing
export const Codemods = {
  'legacy-compat-builders': legacyCompatBuilders,
  'migrate-to-schema': migrateToSchema,
};
export type Codemods = typeof Codemods;

// exports for testing
export const Logs = {
  'legacy-compat-builders': log,
  'migrate-to-schema': migrateToSchemaLog,
};
