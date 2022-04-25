import { ResolvedRegistry } from '@ember-data/types';
import {
  BelongsToRelationshipFieldsFor,
  HasManyRelationshipFieldsFor,
  RecordField,
  RecordType,
  RelatedField,
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
 * This wrapper is provided as an argument to the hook [`Store#createRecordDataFor`](/ember-data/release/classes/Store/methods/createRecordDataFor?anchor=createRecordDataFor)
 * to be used by instantiated RecordData instances for interacting with the store or other
 * RecordData instances.
 *
 * @class RecordDataStoreWrapper
 * @public
 */
export interface RecordDataStoreWrapper<R extends ResolvedRegistry> {
  /**
   * @method relationshipsDefinitionFor
   * @public
   * @param type
   */
  relationshipsDefinitionFor<T extends RecordType<R>>(type: T): RelationshipsSchema<R, T>;

  /**
   * @method attributesDefinitionFor
   * @public
   * @param type
   */
  attributesDefinitionFor<T extends RecordType<R>>(type: T): AttributesSchema<R, T>;

  /**
   * update the `id` for the record of type `modelName` with the corresponding `lid`
   * This operation can only be done for records whose `id` is `null`.
   *
   * @method setRecordId
   * @public
   * @public
   */
  setRecordId<T extends RecordType<R>>(type: T, id: string, lid: string): void;

  /**
   * @method disconnectRecord
   * @public
   * @param type
   * @param id
   * @param lid
   */
  disconnectRecord<T extends RecordType<R>>(type: T, id: string | null, lid: string): void;
  disconnectRecord<T extends RecordType<R>>(type: T, id: string, lid?: string | null): void;
  disconnectRecord<T extends RecordType<R>>(type: T, id: string | null, lid?: string | null): void;

  /**
   * @method isRecordInUse
   * @public
   * @param type
   * @param id
   * @param lid
   */
  isRecordInUse<T extends RecordType<R>>(type: T, id: string | null, lid: string): boolean;
  isRecordInUse<T extends RecordType<R>>(type: T, id: string, lid?: string | null): boolean;
  isRecordInUse<T extends RecordType<R>>(type: T, id: string | null, lid?: string | null): boolean;

  /**
   * @method notifyPropertyChange
   * @public
   * @param type
   * @param id
   * @param lid
   * @param key
   */
  notifyPropertyChange<T extends RecordType<R>, F extends RecordField<R, T> = RecordField<R, T>>(
    type: T,
    id: string | null,
    lid: string | null,
    key: F
  ): void;

  /**
   * @method notifyHasManyChange
   * @public
   * @param type
   * @param id
   * @param lid
   * @param key
   */
  notifyHasManyChange<
    T extends RecordType<R>,
    F extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    lid: string,
    key: F
  ): void;
  notifyHasManyChange<
    T extends RecordType<R>,
    F extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string,
    lid: string | null | undefined,
    key: F
  ): void;
  notifyHasManyChange<
    T extends RecordType<R>,
    F extends HasManyRelationshipFieldsFor<R, T> = HasManyRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    lid: string | null | undefined,
    key: F
  ): void;

  /**
   * @method recordDataFor
   * @public
   * @param type
   * @param id
   * @param lid
   */
  recordDataFor<T extends RecordType<R>>(type: T, id: string, lid?: string | null): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T, id: string | null, lid: string): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T, id?: string | null, lid?: string | null): RecordData<R, T>;

  /**
   * @method notifyBelongsToChange
   * @public
   * @param type
   * @param id
   * @param lid
   * @param key
   */
  notifyBelongsToChange<
    T extends RecordType<R>,
    F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    lid: string,
    key: F
  ): void;
  notifyBelongsToChange<
    T extends RecordType<R>,
    F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string,
    lid: string | null | undefined,
    key: F
  ): void;
  notifyBelongsToChange<
    T extends RecordType<R>,
    F extends BelongsToRelationshipFieldsFor<R, T> = BelongsToRelationshipFieldsFor<R, T>
  >(
    type: T,
    id: string | null,
    lid: string | null | undefined,
    key: F
  ): void;

  /**
   * @method inverseForRelationship
   * @public
   * @param type
   * @param key
   */
  inverseForRelationship<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    type: T,
    key: F
  ): RelatedField<R, T, F> | null;

  /**
   * @method inverseIsAsyncForRelationship
   * @public
   * @param type
   * @param key
   */
  inverseIsAsyncForRelationship<T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
    type: T,
    key: F
  ): boolean;

  /**
   * @method notifyErrorsChange
   * @public
   * @param type
   * @param id
   * @param lid
   */
  notifyErrorsChange<T extends RecordType<R>>(type: T, id: string | null, lid: string | null): void;

  /**
   * @method notifyStateChange
   * @public
   * @param type
   * @param id
   * @param lid
   * @param key
   */
  notifyStateChange<T extends RecordType<R>>(type: T, id: string | null, lid: string | null, key?: string): void;
}
