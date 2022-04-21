import { ResolvedRegistry } from '@ember-data/types';
import {
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordField,
  RecordType,
  RelatedType,
  RelationshipFieldsFor,
} from '@ember-data/types/utils';

import type { RecordData } from './record-data';
import type { AttributesSchema, RelationshipsSchema } from './record-data-schemas';

/**
  @module @ember-data/store
*/

/**
 * Provides encapsulated API access to a minimal subset of store service's
 * functionality for RecordData implementations.
 *
 * @class RecordDataStoreWrapper
 * @public
 */
export interface RecordDataStoreWrapper<R extends ResolvedRegistry> {
  relationshipsDefinitionFor<T extends RecordType<R>>(type: T): RelationshipsSchema<R, T>;
  attributesDefinitionFor<T extends RecordType<R>>(type: T): AttributesSchema<R, T>;

  /**
   * update the `id` for the record of type `modelName` with the corresponding `clientId`
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @public
   */
  setRecordId<T extends RecordType<R>>(type: T, id: string, clientId: string): void;

  disconnectRecord<T extends RecordType<R>>(type: T, id: string | null, clientId: string): void;
  disconnectRecord<T extends RecordType<R>>(type: T, id: string, clientId?: string | null): void;
  disconnectRecord<T extends RecordType<R>>(type: T, id: string | null, clientId?: string | null): void;

  isRecordInUse<T extends RecordType<R>>(type: T, id: string | null, clientId: string): boolean;
  isRecordInUse<T extends RecordType<R>>(type: T, id: string, clientId?: string | null): boolean;
  isRecordInUse<T extends RecordType<R>>(type: T, id: string | null, clientId?: string | null): boolean;

  notifyPropertyChange<T extends RecordType<R>, F extends RecordField<R, T> = RecordField<R, T>>(
    type: T,
    id: string | null,
    clientId: string | null,
    key: F
  ): void;

  notifyHasManyChange<
    T extends RecordType<R>,
    F extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    clientId: string,
    key: F
  ): void;
  notifyHasManyChange<
    T extends RecordType<R>,
    F extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string,
    clientId: string | null | undefined,
    key: F
  ): void;
  notifyHasManyChange<
    T extends RecordType<R>,
    F extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    clientId: string | null | undefined,
    key: F
  ): void;

  recordDataFor<T extends RecordType<R>>(type: T, id: string, lid?: string | null): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T, id: string | null, lid: string): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T, id?: string | null, lid?: string | null): RecordData<R, T>;

  notifyBelongsToChange<
    T extends RecordType<R>,
    F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    clientId: string,
    key: F
  ): void;
  notifyBelongsToChange<
    T extends RecordType<R>,
    F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string,
    clientId: string | null | undefined,
    key: F
  ): void;
  notifyBelongsToChange<
    T extends RecordType<R>,
    F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    clientId: string | null | undefined,
    key: F
  ): void;

  inverseForRelationship<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    type: T,
    key: F
  ): RelatedType<R, T, F> | null;

  inverseIsAsyncForRelationship<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    type: T,
    key: F
  ): boolean;
  notifyErrorsChange<T extends RecordType<R>>(type: T, id: string | null, clientId: string | null): void;
  notifyStateChange<T extends RecordType<R>>(type: T, id: string | null, clientId: string | null, key?: string): void;
}
