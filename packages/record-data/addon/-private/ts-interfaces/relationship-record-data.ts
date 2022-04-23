import type { RecordDataStoreWrapper } from '@ember-data/store/-private';
import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RecordData } from '@ember-data/store/-private/ts-interfaces/record-data';
import type { ResolvedRegistry } from '@ember-data/types';
import type { BelongsToRelationshipFieldsFor, HasManyRelationshipFieldsFor, RecordType } from '@ember-data/types/utils';

import type BelongsToRelationship from '../relationships/state/belongs-to';

export interface DefaultSingleResourceRelationship<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends BelongsToRelationshipFieldsFor<R, T>,
  RT extends RecordType<R> = RecordType<R>
> extends SingleResourceRelationship<RT> {
  _relationship: BelongsToRelationship<R, T, F, RT>;
}

export interface RelationshipRecordData<R extends ResolvedRegistry, T extends RecordType<R>> extends RecordData<R, T> {
  //Required by the relationship layer
  isNew(): boolean;
  modelName: string;
  storeWrapper: RecordDataStoreWrapper<R>;
  identifier: StableRecordIdentifier<T>;
  id: string | null;
  clientId: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): RecordIdentifier<T>;
  getBelongsTo<F extends BelongsToRelationshipFieldsFor<R, T>, RT extends RecordType<R>>(
    key: F
  ): DefaultSingleResourceRelationship<R, T, F, RT>;
  getHasMany<F extends HasManyRelationshipFieldsFor<R, T>, RT extends RecordType<R>>(
    key: F
  ): CollectionResourceRelationship<RT>;
}
