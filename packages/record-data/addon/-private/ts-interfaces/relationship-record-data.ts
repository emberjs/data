import type { RecordDataStoreWrapper } from '@ember-data/store/-private';
import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RecordData } from '@ember-data/store/-private/ts-interfaces/record-data';
import { RecordField, RecordType, RegistryMap, ResolvedRegistry } from '@ember-data/types';

import type BelongsToRelationship from '../relationships/state/belongs-to';

export interface DefaultSingleResourceRelationship<
  R extends ResolvedRegistry<RegistryMap>,
  T extends RecordType<R>,
  K extends RecordField<R, T>,
  RT extends RecordType<R> = RecordType<R>
> extends SingleResourceRelationship<RT> {
  _relationship: BelongsToRelationship<R, T, K, RT>;
}

export interface RelationshipRecordData<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>
  extends RecordData {
  //Required by the relationship layer
  isNew(): boolean;
  modelName: string;
  storeWrapper: RecordDataStoreWrapper<R>;
  identifier: StableRecordIdentifier;
  id: string | null;
  clientId: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): RecordIdentifier;
  getBelongsTo<K extends RecordField<R, T>>(key: K): DefaultSingleResourceRelationship<R, T, K>;
  getHasMany(key: string): CollectionResourceRelationship;
}
