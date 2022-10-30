import { assert } from '@ember/debug';

import type { RelationshipDefinition } from '@ember-data/model/-private/relationship-meta';
import { DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE } from '@ember-data/private-build-infra/deprecations';
import type Store from '@ember-data/store';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RelationshipSchema } from '@ember-data/types/q/record-data-schemas';
import type { Dict } from '@ember-data/types/q/utils';

import { expandingGet, expandingSet, getStore } from './-utils';
import type { Graph } from './graph';

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
  assert(`Expected relationship definition to specify async`, typeof options?.async === 'boolean');
  niceMeta.isAsync = options.async;
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

  let relationships = storeWrapper.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
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
    // TODO probably dont need this assertion if polymorphic
    assert(`Expected the inverse model to exist`, getStore(storeWrapper).modelFor(inverseType));
    inverseDefinition = null;
  } else {
    inverseKey = inverseForRelationship(getStore(storeWrapper), identifier, propertyName);

    // CASE: If we are polymorphic, and we declared an inverse that is non-null
    // we must assume that the lack of inverseKey means that there is no
    // concrete type as the baseType, so we must construct and artificial
    // placeholder
    if (!inverseKey && definition.isPolymorphic && definition.inverseKey) {
      inverseDefinition = {
        kind: 'belongsTo', // this must be updated when we find the first belongsTo or hasMany definition that matches
        key: definition.inverseKey,
        type: type,
        isAsync: false, // this must be updated when we find the first belongsTo or hasMany definition that matches
        isImplicit: false,
        isCollection: false, // this must be updated when we find the first belongsTo or hasMany definition that matches
        isPolymorphic: false,
        isInitialized: false, // tracks whether we have seen the other side at least once
      };

      // CASE: Inverse resolves to null
    } else if (!inverseKey) {
      inverseDefinition = null;
    } else {
      // CASE: We have an explicit inverse or were able to resolve one
      let inverseDefinitions = storeWrapper
        .getSchemaDefinitionService()
        .relationshipsDefinitionFor({ type: inverseType });
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

function metaIsRelationshipDefinition(meta: RelationshipSchema): meta is RelationshipDefinition {
  return typeof (meta as RelationshipDefinition)._inverseKey === 'function';
}

function inverseForRelationship(store: Store, identifier: StableRecordIdentifier | { type: string }, key: string) {
  const definition = store.getSchemaDefinitionService().relationshipsDefinitionFor(identifier)[key];
  if (!definition) {
    return null;
  }

  if (DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE) {
    if (metaIsRelationshipDefinition(definition)) {
      const modelClass = store.modelFor(identifier.type);
      return definition._inverseKey(store, modelClass);
    }
  }

  assert(
    `Expected the relationship defintion to specify the inverse type or null.`,
    definition.options?.inverse === null ||
      (typeof definition.options?.inverse === 'string' && definition.options.inverse.length > 0)
  );
  return definition.options.inverse;
}
