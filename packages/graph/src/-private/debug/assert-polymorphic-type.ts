/* eslint-disable no-inner-declarations, @typescript-eslint/no-shadow */
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';

import { isLegacyField, isRelationshipField, temporaryConvertToLegacy, type UpgradedMeta } from '../-edge-definition';

/*
  Assert that `addedRecord` has a valid type so it can be added to the
  relationship of the `record`.

  The assert basically checks if the `addedRecord` can be added to the
  relationship (specified via `relationshipMeta`) of the `record`.

  This utility should only be used internally, as both record parameters must
  be stable record identifiers and the `relationshipMeta` needs to be the meta
  information about the relationship, retrieved via
  `record.relationshipFor(key)`.
*/
let assertPolymorphicType: (
  parentIdentifier: StableRecordIdentifier,
  parentDefinition: UpgradedMeta,
  addedIdentifier: StableRecordIdentifier,
  store: CacheCapabilitiesManager
) => void;
let assertInheritedSchema: (definition: UpgradedMeta, type: string) => void;

if (DEBUG) {
  function validateSchema(definition: UpgradedMeta, meta: PrintConfig) {
    const errors = new Map();

    if (definition.inverseKey !== meta.name) {
      errors.set('name', ` <---- should be '${definition.inverseKey}'`);
    }
    if (definition.inverseType !== meta.type) {
      errors.set('type', ` <---- should be '${definition.inverseType}'`);
    }
    if (definition.inverseKind !== meta.kind) {
      errors.set('type', ` <---- should be '${definition.inverseKind}'`);
    }
    if (definition.kind !== 'collection') {
      if (definition.inverseIsAsync !== meta.options?.async) {
        errors.set('async', ` <---- should be ${definition.inverseIsAsync}`);
      }
    }
    if (definition.inverseIsPolymorphic && definition.inverseIsPolymorphic !== meta.options?.polymorphic) {
      errors.set('polymorphic', ` <---- should be ${definition.inverseIsPolymorphic}`);
    }
    if (definition.key !== meta.options?.inverse) {
      errors.set('inverse', ` <---- should be '${definition.key}'`);
    }
    if (definition.type !== meta.options?.as) {
      errors.set('as', ` <---- should be '${definition.type}'`);
    }

    return errors;
  }

  type PrintConfig = {
    name: string;
    type: string;
    kind: string;
    options?: {
      as?: string;
      async?: boolean;
      polymorphic?: boolean;
      inverse?: string | null;
    };
  };
  type RelationshipSchemaError = 'name' | 'type' | 'kind' | 'as' | 'async' | 'polymorphic' | 'inverse';

  function expectedSchema(definition: UpgradedMeta) {
    return printSchema({
      name: definition.inverseKey,
      type: definition.inverseType,
      kind: definition.inverseKind,
      options: {
        as: definition.type,
        async: definition.inverseIsAsync,
        polymorphic: definition.inverseIsPolymorphic || false,
        inverse: definition.key,
      },
    });
  }

  function printSchema(config: PrintConfig, errors?: Map<RelationshipSchemaError, string>) {
    const optionLines = [
      config.options?.as ? `      as: '${config.options.as}',${errors?.get('as') || ''}` : '',
      config.kind !== 'collection' ? `      async: ${config.options?.async},${errors?.get('async') || ''}` : '',
      config.options?.polymorphic || errors?.get('polymorphic')
        ? `      polymorphic: ${config.options?.polymorphic},${errors?.get('polymorphic') || ''}`
        : '',
      config.kind !== 'collection' || errors?.get('inverse')
        ? `      inverse: '${config.options?.inverse}'${errors?.get('inverse') || ''}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return `

\`\`\`
{
  ${config.name}: {
    name: '${config.name}',${errors?.get('name') || ''}
    type: '${config.type}',${errors?.get('type') || ''}
    kind: '${config.kind}',${errors?.get('kind') || ''}
    options: {
${optionLines}
    }
  }
}
\`\`\`

`;
  }

  function metaFrom(definition: UpgradedMeta) {
    return {
      name: definition.key,
      type: definition.type,
      kind: definition.kind,
      options: {
        async: definition.isAsync,
        polymorphic: definition.isPolymorphic,
        inverse: definition.inverseKey,
      },
    };
  }
  function inverseMetaFrom(definition: UpgradedMeta) {
    return {
      name: definition.inverseKey,
      type: definition.inverseType,
      kind: definition.inverseKind,
      options: {
        as: definition.isPolymorphic ? definition.type : undefined,
        async: definition.inverseIsAsync,
        polymorphic: definition.inverseIsPolymorphic,
        inverse: definition.key,
      },
    };
  }
  function inverseDefinition(definition: UpgradedMeta): UpgradedMeta {
    return {
      key: definition.inverseKey,
      type: definition.inverseType,
      kind: definition.inverseKind,
      isAsync: definition.inverseIsAsync,
      isPolymorphic: true,
      isCollection: definition.inverseIsCollection,
      isPaginated: definition.inverseIsPaginated,
      isImplicit: definition.inverseIsImplicit,
      inverseKey: definition.key,
      inverseType: definition.type,
      inverseKind: definition.kind,
      inverseIsAsync: definition.isAsync,
      inverseIsPolymorphic: definition.isPolymorphic,
      inverseIsImplicit: definition.isImplicit,
      inverseIsCollection: definition.isCollection,
      inverseIsPaginated: definition.isPaginated,
      resetOnRemoteUpdate: definition.resetOnRemoteUpdate,
    };
  }
  function definitionWithPolymorphic(definition: UpgradedMeta) {
    return Object.assign({}, definition, { inverseIsPolymorphic: true });
  }

  assertInheritedSchema = function assertInheritedSchema(definition: UpgradedMeta, type: string) {
    const meta1 = metaFrom(definition);
    const meta2 = inverseMetaFrom(definition);
    const errors1 = validateSchema(inverseDefinition(definition), meta1);
    const errors2 = validateSchema(definitionWithPolymorphic(definition), meta2);

    if (errors2.size === 0 && errors1.size > 0) {
      throw new Error(
        `The schema for the relationship '${type}.${definition.key}' is not configured to satisfy '${
          definition.inverseType
        }' and thus cannot utilize the '${definition.inverseType}.${definition.key}' relationship to connect with '${
          definition.type
        }.${
          definition.inverseKey
        }'\n\nIf using this relationship in a polymorphic manner is desired, the relationships schema definition for '${type}' should include:${printSchema(
          meta1,
          errors1
        )}`
      );
    } else if (errors1.size > 0) {
      throw new Error(
        `The schema for the relationship '${type}.${definition.key}' is not configured to satisfy '${
          definition.inverseType
        }' and thus cannot utilize the '${definition.inverseType}.${definition.key}' relationship to connect with '${
          definition.type
        }.${
          definition.inverseKey
        }'\n\nIf using this relationship in a polymorphic manner is desired, the relationships schema definition for '${type}' should include:${printSchema(
          meta1,
          errors1
        )} and the relationships schema definition for '${definition.type}' should include:${printSchema(
          meta2,
          errors2
        )}`
      );
    } else if (errors2.size > 0) {
      throw new Error(
        `The schema for the relationship '${type}.${definition.key}' satisfies '${
          definition.inverseType
        }' but cannot utilize the '${definition.inverseType}.${definition.key}' relationship to connect with '${
          definition.type
        }.${
          definition.inverseKey
        }' because that relationship is not polymorphic.\n\nIf using this relationship in a polymorphic manner is desired, the relationships schema definition for '${
          definition.type
        }' should include:${printSchema(meta2, errors2)}`
      );
    }
  };

  assertPolymorphicType = function assertPolymorphicType(
    parentIdentifier: StableRecordIdentifier,
    parentDefinition: UpgradedMeta,
    addedIdentifier: StableRecordIdentifier,
    store: CacheCapabilitiesManager
  ) {
    if (parentDefinition.inverseIsImplicit) {
      return;
    }
    if (parentDefinition.isPolymorphic) {
      let meta = store.schema.fields(addedIdentifier).get(parentDefinition.inverseKey);
      assert(
        `No '${parentDefinition.inverseKey}' field exists on '${
          addedIdentifier.type
        }'. To use this type in the polymorphic relationship '${parentDefinition.inverseType}.${
          parentDefinition.key
        }' the relationships schema definition for ${addedIdentifier.type} should include:${expectedSchema(
          parentDefinition
        )}`,
        meta
      );
      assert(
        `Expected the field ${parentDefinition.inverseKey} to be a relationship`,
        meta && isRelationshipField(meta)
      );
      meta = isLegacyField(meta) ? meta : temporaryConvertToLegacy(meta);
      assert(
        `You should not specify both options.as and options.inverse as null on ${addedIdentifier.type}.${parentDefinition.inverseKey}, as if there is no inverse field there is no abstract type to conform to. You may have intended for this relationship to be polymorphic, or you may have mistakenly set inverse to null.`,
        !(meta.options?.inverse === null && meta.options.as?.length)
      );
      const errors = validateSchema(parentDefinition, meta);
      assert(
        `The schema for the relationship '${parentDefinition.inverseKey}' on '${
          addedIdentifier.type
        }' type does not correctly implement '${parentDefinition.type}' and thus cannot be assigned to the '${
          parentDefinition.key
        }' relationship in '${
          parentIdentifier.type
        }'. If using this record in this polymorphic relationship is desired, correct the errors in the schema shown below:${printSchema(
          meta,
          errors
        )}`,
        errors.size === 0
      );
    } else if (addedIdentifier.type !== parentDefinition.type) {
      // if we are not polymorphic
      // then the addedIdentifier.type must be the same as the parentDefinition.type
      let meta = store.schema.fields(addedIdentifier).get(parentDefinition.inverseKey);
      assert(
        `Expected the field ${parentDefinition.inverseKey} to be a relationship`,
        !meta || isRelationshipField(meta)
      );
      meta = meta && (isLegacyField(meta) ? meta : temporaryConvertToLegacy(meta));
      if (meta?.options.as === parentDefinition.type) {
        // inverse is likely polymorphic but missing the polymorphic flag
        let meta = store.schema.fields({ type: parentDefinition.inverseType }).get(parentDefinition.key);
        assert(`Expected the field ${parentDefinition.key} to be a relationship`, meta && isRelationshipField(meta));
        meta = isLegacyField(meta) ? meta : temporaryConvertToLegacy(meta);
        const errors = validateSchema(definitionWithPolymorphic(inverseDefinition(parentDefinition)), meta);
        assert(
          `The '<${addedIdentifier.type}>.${
            parentDefinition.inverseKey
          }' relationship cannot be used polymorphically because '<${parentDefinition.inverseType}>.${
            parentDefinition.key
          } is not a polymorphic relationship. To use this relationship in a polymorphic manner, fix the following schema issues on the relationships schema for '${
            parentDefinition.inverseType
          }':${printSchema(meta, errors)}`
        );
      } else {
        assert(
          `The '${addedIdentifier.type}' type does not implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. If this relationship should be polymorphic, mark ${parentDefinition.inverseType}.${parentDefinition.key} as \`polymorphic: true\` and ${addedIdentifier.type}.${parentDefinition.inverseKey} as implementing it via \`as: '${parentDefinition.type}'\`.`
        );
      }
    }
  };
}

export { assertPolymorphicType, assertInheritedSchema };
