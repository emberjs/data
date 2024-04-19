import { assert } from '@ember/debug';

import type Store from '@ember-data/store';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { RelationshipSchema } from '@warp-drive/core-types/schema';

import { expandingGet, expandingSet, getStore } from './-utils';
import { assertInheritedSchema } from './debug/assert-polymorphic-type';
import type { Graph } from './graph';

export type EdgeCache = Record<string, Record<string, EdgeDefinition | null>>;

/**
 *
 * Given RHS (Right Hand Side)
 *
 * ```ts
 * class User extends Model {
 *   @hasMany('animal', { async: false, inverse: 'owner' }) pets;
 * }
 * ```
 *
 * Given LHS (Left Hand Side)
 *
 * ```ts
 * class Animal extends Model {
 *  @belongsTo('user', { async: false, inverse: 'pets' }) owner;
 * }
 * ```
 *
 * The UpgradedMeta for the RHS would be:
 *
 * ```ts
 * {
 *   kind: 'hasMany',
 *   key: 'pets',
 *   type: 'animal',
 *   isAsync: false,
 *   isImplicit: false,
 *   isCollection: true,
 *   isPolymorphic: false,
 *   inverseKind: 'belongsTo',
 *   inverseKey: 'owner',
 *   inverseType: 'user',
 *   inverseIsAsync: false,
 *   inverseIsImplicit: false,
 *   inverseIsCollection: false,
 *   inverseIsPolymorphic: false,
 * }
 * ```
 *
 * The UpgradeMeta for the LHS would be:
 *
 * ```ts
 * {
 *   kind: 'belongsTo',
 *   key: 'owner',
 *   type: 'user',
 *   isAsync: false,
 *   isImplicit: false,
 *   isCollection: false,
 *   isPolymorphic: false,
 *   inverseKind: 'hasMany',
 *   inverseKey: 'pets',
 *   inverseType: 'animal',
 *   inverseIsAsync: false,
 *   inverseIsImplicit: false,
 *   inverseIsCollection: true,
 *   inverseIsPolymorphic: false,
 * }
 * ```
 *
 *
 * @class UpgradedMeta
 * @internal
 */
export interface UpgradedMeta {
  kind: 'hasMany' | 'belongsTo' | 'implicit';
  /**
   * The field name on `this` record
   *
   * @internal
   */
  key: string;
  /**
   * The `type` of the related record
   *
   * @internal
   */
  type: string;
  isAsync: boolean;
  isImplicit: boolean;
  isCollection: boolean;
  isPolymorphic: boolean;
  resetOnRemoteUpdate: boolean;

  inverseKind: 'hasMany' | 'belongsTo' | 'implicit';
  /**
   * The field name on the opposing record
   * @internal
   */
  inverseKey: string;
  /**
   * The `type` of `this` record
   * @internal
   */
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

  /**
   * Whether this relationship points back at the same type.
   *
   * If the relationship is polymorphic, this will be true if
   * it points back at the same abstract type.
   *
   * @internal
   */
  isSelfReferential: boolean;

  /**
   * If this is a reflexive relationship, this is true
   * if the relationship also points back at the same
   * field.
   *
   * @internal
   */
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
  const resetOnRemoteUpdate =
    definition.resetOnRemoteUpdate === false || inverseDefinition.resetOnRemoteUpdate === false ? false : true;
  definition.resetOnRemoteUpdate = resetOnRemoteUpdate;
  inverseDefinition.resetOnRemoteUpdate = resetOnRemoteUpdate;
}

function upgradeMeta(meta: RelationshipSchema): UpgradedMeta {
  const niceMeta: UpgradedMeta = {} as UpgradedMeta;
  const options = meta.options;
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

  niceMeta.resetOnRemoteUpdate = options && options.resetOnRemoteUpdate === false ? false : true;

  return niceMeta;
}

function assertConfiguration(info: EdgeDefinition, type: string, key: string) {
  if (DEBUG) {
    const isSelfReferential = info.isSelfReferential;

    if (isSelfReferential) {
      return true;
    }

    const _isRHS =
      key === info.rhs_relationshipName &&
      (type === info.rhs_baseModelName || // base or non-polymorphic
        // if the other side is polymorphic then we need to scan our modelNames
        (info.lhs_isPolymorphic && info.rhs_modelNames.includes(type))); // polymorphic
    const _isLHS =
      key === info.lhs_relationshipName &&
      (type === info.lhs_baseModelName || // base or non-polymorphic
        // if the other side is polymorphic then we need to scan our modelNames
        (info.rhs_isPolymorphic && info.lhs_modelNames.includes(type))); // polymorphic;

    if (!_isRHS && !_isLHS) {
      /*
        this occurs when we are likely polymorphic but not configured to be polymorphic
        most often due to extending a class that has a relationship definition on it.

        e.g.

        ```ts
        class Pet extends Model {
          @belongsTo('human', { async: false, inverse: 'pet' }) owner;
        }
        class Human extends Model {
          @belongsTo('pet', { async: false, inverse: 'owner' }) pet;
        }
        class Farmer extends Human {}
        ```

        In the above case, the following would trigger this error:

        ```ts
        let pet = store.createRecord('pet');
        let farmer = store.createRecord('farmer');
        farmer.pet = pet; // error
        ```

        The correct way to fix this is to specify the polymorphic option on Pet
        and to specify the abstract type 'human' on the Human base class.

        ```ts
        class Pet extends Model {
          @belongsTo('human', { async: false, inverse: 'pet', polymorphic: true }) owner;
        }
        class Human extends Model {
          @belongsTo('pet', { async: false, inverse: 'owner', as: 'human' }) pet;
        }
        class Farmer extends Human {}
        ```

        Alternatively both Human and Farmer could declare the relationship, because relationship
        definitions are "structural".

        ```ts
        class Pet extends Model {
          @belongsTo('human', { async: false, inverse: 'pet', polymorphic: true }) owner;
        }
        class Human extends Model {
          @belongsTo('pet', { async: false, inverse: 'owner', as: 'human' }) pet;
        }
        class Farmer extends Model {
          @belongsTo('pet', { async: false, inverse: 'owner', as: 'human' }) pet;
        }
        ```

       */
      if (key === info.lhs_relationshipName && info.lhs_modelNames.includes(type)) {
        // parentIdentifier, parentDefinition, addedIdentifier, store
        assertInheritedSchema(info.lhs_definition, type);
      } else if (key === info.rhs_relationshipName && info.rhs_modelNames.includes(type)) {
        assertInheritedSchema(info.lhs_definition, type);
      }
      // OPEN AN ISSUE :: we would like to improve our errors but need to understand what corner case got us here
      throw new Error(
        `PLEASE OPEN AN ISSUE :: Found a relationship that is neither the LHS nor RHS of the same edge. This is not supported. Please report this to the EmberData team.`
      );
    }

    if (_isRHS && _isLHS) {
      // not sure how we get here but it's probably the result of some form of inheritance
      // without having specified polymorphism correctly leading to it not being self-referential
      // OPEN AN ISSUE :: we would like to improve our errors but need to understand what corner case got us here
      throw new Error(
        `PLEASE OPEN AN ISSUE :: Found a relationship that is both the LHS and RHS of the same edge but is not self-referential. This is not supported. Please report this to the EmberData team.`
      );
    }
  }
}

export function isLHS(info: EdgeDefinition, type: string, key: string): boolean {
  const isSelfReferential = info.isSelfReferential;
  const isRelationship = key === info.lhs_relationshipName;

  if (DEBUG) {
    assertConfiguration(info, type, key);
  }

  if (isRelationship === true) {
    return (
      isSelfReferential === true || // itself
      type === info.lhs_baseModelName || // base or non-polymorphic
      // if the other side is polymorphic then we need to scan our modelNames
      (info.rhs_isPolymorphic && info.lhs_modelNames.includes(type)) // polymorphic
    );
  }

  return false;
}

export function isRHS(info: EdgeDefinition, type: string, key: string): boolean {
  const isSelfReferential = info.isSelfReferential;
  const isRelationship = key === info.rhs_relationshipName;

  if (DEBUG) {
    assertConfiguration(info, type, key);
  }

  if (isRelationship === true) {
    return (
      isSelfReferential === true || // itself
      type === info.rhs_baseModelName || // base or non-polymorphic
      // if the other side is polymorphic then we need to scan our modelNames
      (info.lhs_isPolymorphic && info.rhs_modelNames.includes(type)) // polymorphic
    );
  }

  return false;
}

export function upgradeDefinition(
  graph: Graph,
  identifier: StableRecordIdentifier,
  propertyName: string,
  isImplicit = false
): EdgeDefinition | null {
  const cache = graph._definitionCache;
  const storeWrapper = graph.store;
  const polymorphicLookup = graph._potentialPolymorphicTypes;

  const { type } = identifier;
  let cached = /*#__NOINLINE__*/ expandingGet<EdgeDefinition | null>(cache, type, propertyName);

  // CASE: We have a cached resolution (null if no relationship exists)
  if (cached !== undefined) {
    return cached;
  }

  assert(
    `Expected to find relationship definition in the cache for the implicit relationship ${propertyName}`,
    !isImplicit
  );

  const relationships = storeWrapper.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
  assert(`Expected to have a relationship definition for ${type} but none was found.`, relationships);
  const meta = relationships[propertyName];

  if (!meta) {
    // TODO potentially we should just be permissive here since this is an implicit relationship
    // and not require the lookup table to be populated
    if (polymorphicLookup[type]) {
      const altTypes = Object.keys(polymorphicLookup[type]);
      for (let i = 0; i < altTypes.length; i++) {
        const _cached = expandingGet<EdgeDefinition | null>(cache, altTypes[i], propertyName);
        if (_cached) {
          /*#__NOINLINE__*/ expandingSet<EdgeDefinition | null>(cache, type, propertyName, _cached);
          _cached.rhs_modelNames.push(type);
          return _cached;
        }
      }
    }

    // CASE: We don't have a relationship at all
    // we should only hit this in prod
    assert(`Expected a relationship schema for '${type}.${propertyName}', but no relationship schema was found.`, meta);

    cache[type][propertyName] = null;
    return null;
  }
  const definition = /*#__NOINLINE__*/ upgradeMeta(meta);

  let inverseDefinition: UpgradedMeta | null;
  let inverseKey: string | null;
  const inverseType = definition.type;

  // CASE: Inverse is explicitly null
  if (definition.inverseKey === null) {
    // TODO probably dont need this assertion if polymorphic
    assert(`Expected the inverse model to exist`, getStore(storeWrapper).modelFor(inverseType));
    inverseDefinition = null;
  } else {
    inverseKey = /*#__NOINLINE__*/ inverseForRelationship(getStore(storeWrapper), identifier, propertyName);

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
      } as UpgradedMeta; // the rest of the fields are populated by syncMeta

      // CASE: Inverse resolves to null
    } else if (!inverseKey) {
      inverseDefinition = null;
    } else {
      // CASE: We have an explicit inverse or were able to resolve one
      const inverseDefinitions = storeWrapper
        .getSchemaDefinitionService()
        .relationshipsDefinitionFor({ type: inverseType });
      assert(`Expected to have a relationship definition for ${inverseType} but none was found.`, inverseDefinitions);
      const metaFromInverse = inverseDefinitions[inverseKey];
      assert(
        `Expected a relationship schema for '${inverseType}.${inverseKey}' to match the inverse of '${type}.${propertyName}', but no relationship schema was found.`,
        metaFromInverse
      );

      inverseDefinition = upgradeMeta(metaFromInverse);
    }
  }

  // CASE: We have no inverse
  if (!inverseDefinition) {
    // polish off meta
    inverseKey = /*#__NOINLINE__*/ implicitKeyFor(type, propertyName);
    inverseDefinition = {
      kind: 'implicit',
      key: inverseKey,
      type: type,
      isAsync: false,
      isImplicit: true,
      isCollection: true, // with implicits any number of records could point at us
      isPolymorphic: false,
    } as UpgradedMeta; // the rest of the fields are populated by syncMeta

    syncMeta(definition, inverseDefinition);
    syncMeta(inverseDefinition, definition);

    const info = {
      lhs_key: `${type}:${propertyName}`,
      lhs_modelNames: [type],
      lhs_baseModelName: type,
      lhs_relationshipName: propertyName,
      lhs_definition: definition,
      lhs_isPolymorphic: definition.isPolymorphic,

      rhs_key: inverseDefinition.key,
      rhs_modelNames: [inverseType],
      rhs_baseModelName: inverseType,
      rhs_relationshipName: inverseDefinition.key,
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
      let inverseDoubleCheck = inverseFor(inverseRelationshipName, store);

      assert(`The ${inverseBaseModelName}:${inverseRelationshipName} relationship declares 'inverse: null', but it was resolved as the inverse for ${baseModelName}:${relationshipName}.`, inverseDoubleCheck);
    }
  */
  // CASE: We may have already discovered the inverse for the baseModelName
  // CASE: We have already discovered the inverse
  assert(
    `We should have determined an inverseKey by now, open an issue if this is hit`,
    typeof inverseKey! === 'string' && inverseKey.length > 0
  );
  cached = expandingGet(cache, baseType, propertyName) || expandingGet(cache, inverseType, inverseKey);

  if (cached) {
    // TODO this assert can be removed if the above assert is enabled
    assert(
      `The ${inverseType}:${inverseKey} relationship declares 'inverse: null', but it was resolved as the inverse for ${type}:${propertyName}.`,
      cached.hasInverse !== false
    );

    const _isLHS = cached.lhs_baseModelName === baseType;
    const modelNames = _isLHS ? cached.lhs_modelNames : cached.rhs_modelNames;
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
  const isSelfReferential = baseType === inverseType;
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

function inverseForRelationship(store: Store, identifier: StableRecordIdentifier | { type: string }, key: string) {
  const definition = store.getSchemaDefinitionService().relationshipsDefinitionFor(identifier)[key];
  if (!definition) {
    return null;
  }

  assert(
    `Expected the relationship defintion to specify the inverse type or null.`,
    definition.options?.inverse === null ||
      (typeof definition.options?.inverse === 'string' && definition.options.inverse.length > 0)
  );
  return definition.options.inverse;
}
