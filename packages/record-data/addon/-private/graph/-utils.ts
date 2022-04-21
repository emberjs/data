import { assert, inspect, warn } from '@ember/debug';

import { coerceId, recordDataFor as peekRecordData } from '@ember-data/store/-private';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RecordData } from '@ember-data/store/-private/ts-interfaces/record-data';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';
import { ResolvedRegistry } from '@ember-data/types';
import { RecordType } from '@ember-data/types/utils';

import type BelongsToRelationship from '../relationships/state/belongs-to';
import type ManyRelationship from '../relationships/state/has-many';
import type ImplicitRelationship from '../relationships/state/implicit';
import type { RelationshipRecordData } from '../ts-interfaces/relationship-record-data';
import type { UpdateRelationshipOperation } from './-operations';
import type { Graph } from './index';

export function expandingGet<T>(cache: Dict<Dict<T>>, key1: string, key2: string): T | undefined {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  return mainCache[key2];
}

export function expandingSet<T>(cache: Dict<Dict<T>>, key1: string, key2: string, value: T): void {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  mainCache[key2] = value;
}

export function assertValidRelationshipPayload<R extends ResolvedRegistry>(
  graph: Graph<R>,
  op: UpdateRelationshipOperation<R>
) {
  type T = typeof op.record.type;
  type Rel = ManyRelationship<R, T> | ImplicitRelationship<R, T> | BelongsToRelationship<R, T>;
  const relationship = graph.get(op.record, op.field);
  assert(`Cannot update an implicit relationship`, isHasMany(relationship as Rel) || isBelongsTo(relationship as Rel));

  const payload = op.value;
  const { definition, identifier, state } = relationship;
  const { type } = identifier;
  const { field } = op;
  const { isAsync, kind } = definition;

  if (payload.links) {
    warn(
      `You pushed a record of type '${type}' with a relationship '${field}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
      isAsync || !!payload.data || state.hasReceivedData,
      {
        id: 'ds.store.push-link-for-sync-relationship',
      }
    );
  } else if (payload.data) {
    if (kind === 'belongsTo') {
      assert(
        `A ${type} record was pushed into the store with the value of ${field} being ${inspect(
          payload.data
        )}, but ${field} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
        !Array.isArray(payload.data)
      );
      assertRelationshipData(graph.store._store, identifier, payload.data, definition);
    } else if (kind === 'hasMany') {
      assert(
        `A ${type} record was pushed into the store with the value of ${field} being '${inspect(
          payload.data
        )}', but ${field} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`,
        Array.isArray(payload.data)
      );
      if (Array.isArray(payload.data)) {
        for (let i = 0; i < payload.data.length; i++) {
          assertRelationshipData(graph.store._store, identifier, payload.data[i], definition);
        }
      }
    }
  }
}

export function isNew<R extends ResolvedRegistry, T extends RecordType<R>>(
  identifier: StableRecordIdentifier<T>
): boolean {
  if (!identifier.id) {
    return true;
  }
  const recordData = peekRecordData(identifier);
  return recordData ? isRelationshipRecordData(recordData) && recordData.isNew() : false;
}

function isRelationshipRecordData<R extends ResolvedRegistry, T extends RecordType<R>>(
  recordData: RecordData<R, T> | RelationshipRecordData<R, T>
): recordData is RelationshipRecordData<R, T> {
  return typeof (recordData as RelationshipRecordData<R, T>).isNew === 'function';
}

export function isBelongsTo<R extends ResolvedRegistry, T extends RecordType<R>>(
  relationship: ManyRelationship<R, T> | ImplicitRelationship<R, T> | BelongsToRelationship<R, T>
): relationship is BelongsToRelationship<R, T> {
  return relationship.definition.kind === 'belongsTo';
}

export function isImplicit<R extends ResolvedRegistry, T extends RecordType<R>>(
  relationship: ManyRelationship<R, T> | ImplicitRelationship<R, T> | BelongsToRelationship<R, T>
): relationship is ImplicitRelationship<R, T> {
  return relationship.definition.isImplicit;
}

export function isHasMany<R extends ResolvedRegistry, T extends RecordType<R>>(
  relationship: ManyRelationship<R, T> | ImplicitRelationship<R, T> | BelongsToRelationship<R, T>
): relationship is ManyRelationship<R, T> {
  return relationship.definition.kind === 'hasMany';
}

export function assertRelationshipData(store, identifier, data, meta) {
  assert(
    `A ${identifier.type} record was pushed into the store with the value of ${meta.key} being '${JSON.stringify(
      data
    )}', but ${
      meta.key
    } is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
    !Array.isArray(data)
  );
  assert(
    `Encountered a relationship identifier without a type for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${identifier.id}>, expected a json-api identifier with type '${meta.type}' but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || (typeof data.type === 'string' && data.type.length)
  );
  assert(
    `Encountered a relationship identifier without an id for the ${meta.kind} relationship '${meta.key}' on <${
      identifier.type
    }:${identifier.id}>, expected a json-api identifier but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || !!coerceId(data.id)
  );
  assert(
    `Encountered a relationship identifier with type '${data.type}' for the ${meta.kind} relationship '${meta.key}' on <${identifier.type}:${identifier.id}>, Expected a json-api identifier with type '${meta.type}'. No model was found for '${data.type}'.`,
    data === null || !data.type || store._hasModelFor(data.type)
  );
}
