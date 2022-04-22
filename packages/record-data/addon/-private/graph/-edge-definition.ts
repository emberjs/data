import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RelationshipSchema } from '@ember-data/store/-private/ts-interfaces/record-data-schemas';
import type { ResolvedRegistry } from '@ember-data/types';
import type { RecordType, RelatedType, RelationshipFieldsFor } from '@ember-data/types/utils';

import type { Graph } from '.';

export type EdgeCache<R extends ResolvedRegistry> = {
  [T in RecordType<R>]: {
    [F in RelationshipFieldsFor<R, T>]: EdgeDefinition<R, T, F> | null;
  };
};

function expandingGet<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(cache: EdgeCache<R>, key1: T, key2: F): EdgeDefinition<R, T, F, RT> | null | undefined {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  return mainCache[key2] as EdgeDefinition<R, T, F, RT> | null | undefined;
}

function expandingSet<R extends ResolvedRegistry, T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
  cache: EdgeCache<R>,
  key1: T,
  key2: F,
  value: EdgeDefinition<R, T, F> | null
): void {
  let mainCache = (cache[key1] = cache[key1] || Object.create(null));
  mainCache[key2] = value;
}

export interface UpgradedRelationshipMeta<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RecordType<R>,
  RF extends RelationshipFieldsFor<R, RT> = RelationshipFieldsFor<R, RT>
> {
  kind: 'hasMany' | 'belongsTo' | 'implicit';
  key: F;
  type: RT;
  isAsync: boolean;
  isImplicit: boolean;
  isCollection: boolean;
  isPolymorphic: boolean;

  inverseKind: 'hasMany' | 'belongsTo' | 'implicit';
  inverseKey: RF;
  inverseType: T;
  inverseIsAsync: boolean;
  inverseIsImplicit: boolean;
  inverseIsCollection: boolean;
  inverseIsPolymorphic: boolean;
}

export interface EdgeDefinition<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RecordType<R> = RelatedType<R, T, F>,
  RF extends RelationshipFieldsFor<R, RT> = RelationshipFieldsFor<R, RT>
> {
  lhs_key: string;
  lhs_modelNames: string[];
  lhs_baseModelName: string;
  lhs_relationshipName: string;
  lhs_definition: UpgradedRelationshipMeta<R, T, F, RT>;
  lhs_isPolymorphic: boolean;

  rhs_key: string;
  rhs_modelNames: string[];
  rhs_baseModelName: string;
  rhs_relationshipName: string;
  rhs_definition: UpgradedRelationshipMeta<R, RT, RF, T> | null;
  rhs_isPolymorphic: boolean;

  hasInverse: boolean;
  isSelfReferential: boolean;
  isReflexive: boolean;
}

const BOOL_LATER = null as unknown as boolean;
const STR_LATER = '';
const IMPLICIT_KEY_RAND = Date.now();

// we pretend implicit keys are real relationship keys
// this helps more type info flow through everything vs falling back to strings
function implicitKeyFor<RT extends string>(type: string, key: string): RT {
  return `implicit-${type}:${key}${IMPLICIT_KEY_RAND}` as RT;
}

interface InProgressMeta {
  kind: 'hasMany' | 'belongsTo' | 'implicit';
  key: string;
  type: string;
  isAsync: boolean;
  isImplicit: boolean;
  isCollection: boolean;
  isPolymorphic: boolean;

  inverseKind: 'hasMany' | 'belongsTo' | 'implicit';
  inverseKey: string;
  inverseType: string;
  inverseIsAsync: boolean;
  inverseIsImplicit: boolean;
  inverseIsCollection: boolean;
  inverseIsPolymorphic: boolean;
}

function _sync(definition: InProgressMeta, inverseDefinition: InProgressMeta) {
  definition.inverseKind = inverseDefinition.kind;
  definition.inverseKey = inverseDefinition.key;
  definition.inverseType = inverseDefinition.type;
  definition.inverseIsAsync = inverseDefinition.isAsync;
  definition.inverseIsCollection = inverseDefinition.isCollection;
  definition.inverseIsPolymorphic = inverseDefinition.isPolymorphic;
  definition.inverseIsImplicit = inverseDefinition.isImplicit;
}

function syncMeta(definition: InProgressMeta, inverseDefinition: InProgressMeta) {
  _sync(definition, inverseDefinition);
  _sync(inverseDefinition, definition);
}

function upgradeMeta<R extends ResolvedRegistry, T extends RecordType<R>, F extends RelationshipFieldsFor<R, T>>(
  meta: RelationshipSchema<R, T, F>
): UpgradedRelationshipMeta<R, T, F, RelatedType<R, T, F>> {
  type RT = RelatedType<R, T, F>;
  type RF = RelationshipFieldsFor<R, RT>;
  let niceMeta: UpgradedRelationshipMeta<R, T, F, RT> = {} as UpgradedRelationshipMeta<R, T, F, RT>;
  let options = meta.options;
  niceMeta.kind = meta.kind;
  niceMeta.key = meta.name;
  niceMeta.type = meta.type;
  niceMeta.isAsync = options && options.async !== undefined ? !!options.async : true;
  niceMeta.isImplicit = false;
  niceMeta.isCollection = meta.kind === 'hasMany';
  niceMeta.isPolymorphic = options && !!options.polymorphic;

  niceMeta.inverseKey = ((options && options.inverse) || STR_LATER) as RF;
  niceMeta.inverseType = STR_LATER as T;
  niceMeta.inverseIsAsync = BOOL_LATER;
  niceMeta.inverseIsImplicit = (options && options.inverse === null) || BOOL_LATER;
  niceMeta.inverseIsCollection = BOOL_LATER;

  return niceMeta;
}

export function isLHS<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RecordType<R> = RelatedType<R, T, F>
>(info: EdgeDefinition<R, T, F, RT>, type: RecordType<R>, key: RelationshipFieldsFor<R, T>): type is T {
  let isSelfReferential = info.isSelfReferential;
  let isRelationship = key === info.lhs_relationshipName;

  if (isRelationship === true) {
    return (
      isSelfReferential === true || // itself
      type === info.lhs_baseModelName || // base or non-polymorphic
      // if the other side is polymorphic then we need to scan our modelNames
      (info.rhs_isPolymorphic && info.lhs_modelNames.indexOf(type) !== -1) // polymorphic
    );
  }

  return false;
}

export function isRHS<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RecordType<R> = RelatedType<R, T, F>
>(info: EdgeDefinition<R, T, F, RT>, type: RecordType<R>, key: RelationshipFieldsFor<R, T>): type is T {
  let isSelfReferential = info.isSelfReferential;
  let isRelationship = key === info.rhs_relationshipName;

  if (isRelationship === true) {
    return (
      isSelfReferential === true || // itself
      type === info.rhs_baseModelName || // base or non-polymorphic
      // if the other side is polymorphic then we need to scan our modelNames
      (info.lhs_isPolymorphic && info.rhs_modelNames.indexOf(type) !== -1) // polymorphic
    );
  }

  return false;
}

export function upgradeDefinition<
  R extends ResolvedRegistry,
  T extends RecordType<R>,
  F extends RelationshipFieldsFor<R, T>,
  RT extends RelatedType<R, T, F>
>(
  graph: Graph<R>,
  identifier: StableRecordIdentifier<T>,
  propertyName: F,
  isImplicit: boolean = false
): EdgeDefinition<R, T, F, RT> | null {
  const cache = graph._definitionCache;
  const storeWrapper = graph.store;
  const polymorphicLookup = graph._potentialPolymorphicTypes;

  const { type } = identifier;
  let cached = expandingGet<R, T, F, RT>(cache, type, propertyName);

  // CASE: We have a cached resolution (null if no relationship exists)
  if (cached !== undefined) {
    return cached;
  }

  assert(
    `Expected to find relationship definition in the cache for the implicit relationship ${propertyName}`,
    !isImplicit
  );

  let relationships = storeWrapper.relationshipsDefinitionFor(type);
  assert(`Expected to have a relationship definition for ${type} but none was found.`, relationships);
  let meta = relationships[propertyName];

  if (!meta) {
    if (polymorphicLookup[type]) {
      const altTypes = Object.keys(polymorphicLookup[type]) as RecordType<R>[];
      for (let i = 0; i < altTypes.length; i++) {
        let cached = expandingGet<R, T, F, RT>(cache, altTypes[i] as T, propertyName);
        if (cached) {
          expandingSet(cache, type, propertyName, cached);
          return cached;
        }
      }
    }

    // CASE: We don't have a relationship at all
    // we should only hit this in prod
    assert(`Expected to find a relationship definition for ${type}.${propertyName} but none was found.`, meta);

    cache[type]![propertyName] = null;
    return null;
  }
  const definition = upgradeMeta(meta);

  let inverseDefinition: UpgradedRelationshipMeta<R, RT, RelationshipFieldsFor<R, RT>, T, F> | null | undefined;
  let inverseKey: RelationshipFieldsFor<R, RT> | null | undefined;
  const inverseType = definition.type as RecordType<R>;

  // CASE: Inverse is explicitly null
  if (definition.inverseKey === null) {
    assert(`Expected the inverse model to exist`, storeWrapper._store.modelFor(inverseType));
    inverseDefinition = null;
  } else {
    inverseKey = storeWrapper.inverseForRelationship(type, propertyName);

    // CASE: Inverse resolves to null
    if (!inverseKey) {
      inverseDefinition = null;
    } else {
      // CASE: We have an explicit inverse or were able to resolve one
      let inverseDefinitions = storeWrapper.relationshipsDefinitionFor(inverseType);
      assert(`Expected to have a relationship definition for ${inverseType} but none was found.`, inverseDefinitions);
      let meta = inverseDefinitions[inverseKey];
      assert(`Expected to find a relationship definition for ${inverseType}.${inverseKey} but none was found.`, meta);
      inverseDefinition = upgradeMeta(meta);
    }
  }

  // CASE: We have no inverse
  if (!inverseDefinition) {
    // polish off meta
    inverseKey = implicitKeyFor<RelationshipFieldsFor<R, RT>>(type, propertyName);
    inverseDefinition = {
      kind: 'implicit',
      key: inverseKey,
      type: type,
      isAsync: false,
      isImplicit: true,
      isCollection: true, // with implicits any number of records could point at us
      isPolymorphic: false,
    } as UpgradedRelationshipMeta<R, RT, RelationshipFieldsFor<R, RT>, T, F>;

    syncMeta(definition, inverseDefinition);

    const info = {
      lhs_key: `${type}:${propertyName}`,
      lhs_modelNames: [type],
      lhs_baseModelName: type,
      lhs_relationshipName: propertyName,
      lhs_definition: definition,
      lhs_isPolymorphic: definition.isPolymorphic,

      rhs_key: '',
      rhs_modelNames: [],
      rhs_baseModelName: inverseType,
      rhs_relationshipName: '',
      rhs_definition: inverseDefinition,
      rhs_isPolymorphic: false,

      hasInverse: false,
      isSelfReferential: type === inverseType, // this could be wrong if we are self-referential but also polymorphic
      isReflexive: false, // we can't be reflexive if we don't define an inverse
    };

    expandingSet(cache, inverseType, inverseKey, info);
    expandingSet(cache, type, propertyName, info);
    return info;
  }

  // CASE: We do have an inverse
  const baseType = inverseDefinition.type as RecordType<R>;

  // TODO we want to assert this but this breaks all of our shoddily written tests
  /*
    if (DEBUG) {
      let inverseDoubleCheck = inverseMeta.type.inverseFor(inverseRelationshipName, store);

      assert(`The ${inverseBaseModelName}:${inverseRelationshipName} relationship declares 'inverse: null', but it was resolved as the inverse for ${baseModelName}:${relationshipName}.`, inverseDoubleCheck);
    }
  */
  // CASE: We may have already discovered the inverse for the baseModelName
  // CASE: We have already discovered the inverse
  cached = expandingGet(cache, baseType, propertyName) || expandingGet(cache, inverseType, inverseKey);

  if (cached) {
    // TODO this assert can be removed if the above assert is enabled
    assert(
      `The ${inverseType}:${inverseKey} relationship declares 'inverse: null', but it was resolved as the inverse for ${type}:${propertyName}.`,
      cached.hasInverse !== false
    );

    let isLHS = cached.lhs_baseModelName === baseType;
    let modelNames = isLHS ? cached.lhs_modelNames : cached.rhs_modelNames;
    // make this lookup easier in the future by caching the key
    modelNames.push(type);
    expandingSet(cache, type, propertyName, cached);

    return cached;
  }

  // this is our first time so polish off the metas
  syncMeta(definition, inverseDefinition);

  const lhs_modelNames = [type];
  if (type !== baseType) {
    lhs_modelNames.push(baseType);
  }
  const isSelfReferential = type === inverseType;
  const info = {
    lhs_key: `${baseType}:${propertyName}`,
    lhs_modelNames,
    lhs_baseModelName: baseType,
    lhs_relationshipName: propertyName,
    lhs_definition: definition,
    lhs_isPolymorphic: definition.isPolymorphic,

    rhs_key: `${inverseType}:${inverseKey}`,
    rhs_modelNames: [inverseType],
    rhs_baseModelName: inverseType,
    rhs_relationshipName: inverseKey,
    rhs_definition: inverseDefinition,
    rhs_isPolymorphic: inverseDefinition.isPolymorphic,
    hasInverse: true,
    isSelfReferential,
    isReflexive: isSelfReferential && propertyName === inverseKey,
  };

  // Create entries for the baseModelName as well as modelName to speed up
  //  inverse lookups
  expandingSet(cache, baseType, propertyName, info);
  expandingSet(cache, type, propertyName, info);

  // Greedily populate the inverse
  expandingSet(cache, inverseType, inverseKey, info);

  return info;
}
