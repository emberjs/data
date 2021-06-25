import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RelationshipSchema } from '@ember-data/store/-private/ts-interfaces/record-data-schemas';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';

import type { Graph } from '.';
import { expandingGet, expandingSet } from './-utils';

export type EdgeCache = Dict<Dict<EdgeDefinition | null>>;

export interface UpgradedMeta {
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

export interface EdgeDefinition {
  lhs_key: string;
  lhs_modelNames: string[];
  lhs_baseModelName: string;
  lhs_relationshipName: string;
  lhs_definition: UpgradedMeta;
  lhs_isPolymorphic: boolean;

  rhs_key: string;
  rhs_modelNames: string[];
  rhs_baseModelName: string;
  rhs_relationshipName: string;
  rhs_definition: UpgradedMeta | null;
  rhs_isPolymorphic: boolean;

  hasInverse: boolean;
  isSelfReferential: boolean;
  isReflexive: boolean;
}

const BOOL_LATER = null as unknown as boolean;
const STR_LATER = '';
const IMPLICIT_KEY_RAND = Date.now();

function implicitKeyFor(type: string, key: string): string {
  return `implicit-${type}:${key}${IMPLICIT_KEY_RAND}`;
}

function syncMeta(definition: UpgradedMeta, inverseDefinition: UpgradedMeta) {
  definition.inverseKind = inverseDefinition.kind;
  definition.inverseKey = inverseDefinition.key;
  definition.inverseType = inverseDefinition.type;
  definition.inverseIsAsync = inverseDefinition.isAsync;
  definition.inverseIsCollection = inverseDefinition.isCollection;
  definition.inverseIsPolymorphic = inverseDefinition.isPolymorphic;
  definition.inverseIsImplicit = inverseDefinition.isImplicit;
}

function upgradeMeta(meta: RelationshipSchema): UpgradedMeta {
  let niceMeta: UpgradedMeta = {} as UpgradedMeta;
  let options = meta.options;
  niceMeta.kind = meta.kind;
  niceMeta.key = meta.name;
  niceMeta.type = meta.type;
  niceMeta.isAsync = options && options.async !== undefined ? !!options.async : true;
  niceMeta.isImplicit = false;
  niceMeta.isCollection = meta.kind === 'hasMany';
  niceMeta.isPolymorphic = options && !!options.polymorphic;

  niceMeta.inverseKey = (options && options.inverse) || STR_LATER;
  niceMeta.inverseType = STR_LATER;
  niceMeta.inverseIsAsync = BOOL_LATER;
  niceMeta.inverseIsImplicit = (options && options.inverse === null) || BOOL_LATER;
  niceMeta.inverseIsCollection = BOOL_LATER;

  return niceMeta;
}

export function isLHS(info: EdgeDefinition, type: string, key: string): boolean {
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

export function isRHS(info: EdgeDefinition, type: string, key: string): boolean {
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

export function upgradeDefinition(
  graph: Graph,
  identifier: StableRecordIdentifier,
  propertyName: string,
  isImplicit: boolean = false
): EdgeDefinition | null {
  const cache = graph._definitionCache;
  const storeWrapper = graph.store;
  const polymorphicLookup = graph._potentialPolymorphicTypes;

  const { type } = identifier;
  let cached = expandingGet<EdgeDefinition | null>(cache, type, propertyName);

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
      const altTypes = Object.keys(polymorphicLookup[type] as {});
      for (let i = 0; i < altTypes.length; i++) {
        let cached = expandingGet<EdgeDefinition | null>(cache, altTypes[i], propertyName);
        if (cached) {
          expandingSet<EdgeDefinition | null>(cache, type, propertyName, cached);
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

  let inverseDefinition;
  let inverseKey;
  const inverseType = definition.type;

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
    inverseKey = implicitKeyFor(type, propertyName);
    inverseDefinition = {
      kind: 'implicit',
      key: inverseKey,
      type: type,
      isAsync: false,
      isImplicit: true,
      isCollection: true, // with implicits any number of records could point at us
      isPolymorphic: false,
    };

    syncMeta(definition, inverseDefinition);
    syncMeta(inverseDefinition, definition);

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

    expandingSet<EdgeDefinition | null>(cache, inverseType, inverseKey, info);
    expandingSet<EdgeDefinition | null>(cache, type, propertyName, info);
    return info;
  }

  // CASE: We do have an inverse
  const baseType = inverseDefinition.type;

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
    expandingSet<EdgeDefinition | null>(cache, type, propertyName, cached);

    return cached;
  }

  // this is our first time so polish off the metas
  syncMeta(definition, inverseDefinition);
  syncMeta(inverseDefinition, definition);

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
  expandingSet<EdgeDefinition | null>(cache, baseType, propertyName, info);
  expandingSet<EdgeDefinition | null>(cache, type, propertyName, info);

  // Greedily populate the inverse
  expandingSet<EdgeDefinition | null>(cache, inverseType, inverseKey, info);

  return info;
}
