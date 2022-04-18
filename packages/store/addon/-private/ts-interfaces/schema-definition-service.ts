/**
  @module @ember-data/store
*/

import { RecordType, RegistryMap, ResolvedRegistry } from '@ember-data/types';

import type { RecordIdentifier } from './identifier';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';

export interface SchemaDefinitionService<R extends ResolvedRegistry<RegistryMap>> {
  doesTypeExist<T extends RecordType<R>>(modelName: T | string): modelName is T;
  attributesDefinitionFor<T extends RecordType<R>>(
    identifier: RecordIdentifier<T> | { type: T }
  ): AttributesSchema<R, T>;
  relationshipsDefinitionFor<T extends RecordType<R>>(
    identifier: RecordIdentifier | { type: string }
  ): RelationshipsSchema<R, T>;
}
