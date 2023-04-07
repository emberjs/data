import { assert } from '@ember/debug';
import { DEBUG } from '@ember-data/env';

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
let assertPolymorphicType;

if (DEBUG) {
  let checkPolymorphic = function checkPolymorphic(modelClass, addedModelClass) {
    if (modelClass.__isMixin) {
      return (
        modelClass.__mixin.detect(addedModelClass.PrototypeMixin) ||
        // handle native class extension e.g. `class Post extends Model.extend(Commentable) {}`
        modelClass.__mixin.detect(Object.getPrototypeOf(addedModelClass).PrototypeMixin)
      );
    }

    return addedModelClass.prototype instanceof modelClass || modelClass.detect(addedModelClass);
  };

  function validateSchema(definition, meta) {
    const errors = [];

    if (definition.inverseKey !== meta.name) {
      errors.push(['name', ` <---- should be '${definition.inverseKey}'`]);
    }
    if (definition.inverseType !== meta.type) {
      errors.push(['type', ` <---- should be '${definition.inverseType}'`]);
    }
    if (definition.inverseKind !== meta.kind) {
      errors.push(['type', ` <---- should be '${definition.inverseKind}'`]);
    }
    if (definition.inverseIsAsync !== meta.options.async) {
      errors.push(['async', ` <---- should be ${definition.inverseIsAsync}`]);
    }
    if (definition.inverseIsPolymorphic && definition.inverseIsPolymorphic !== meta.options.polymorphic) {
      errors.push(['polymorphic', ` <---- should be ${definition.inverseIsPolymorphic}`]);
    }
    if (definition.key !== meta.options.inverse) {
      errors.push(['inverse', ` <---- should be '${definition.key}'`]);
    }
    if (definition.type !== meta.options.as) {
      errors.push(['as', ` <---- should be '${definition.type}'`]);
    }

    return new Map(errors);
  }

  function expectedSchema(definition) {
    return printSchema({
      name: definition.inverseKey,
      type: definition.inverseType,
      kind: definition.inverseKind,
      options: {
        as: definition.type,
        async: definition.inverseIsAsync,
        polymorphic: definition.inverseIsPolymorphic || false,
        inverse: definition.key
      }
    });
  }

  function printSchema(config, errors) {
    return `

\`\`\`
{
  ${config.name}: {
    name: '${config.name}${errors?.get('name') || ''}',
    type: '${config.type}${errors?.get('type') || ''}',
    kind: '${config.kind}${errors?.get('kind') || ''}',
    options: {
      as: '${config.options.as}',${errors?.get('as') || ''}
      async: ${config.options.async},${errors?.get('async') || ''}
      polymorphic: ${config.options.polymorphic},${errors?.get('polymorphic') || ''}
      inverse: '${config.options.inverse}'${errors?.get('inverse') || ''}
    }
  }
}
\`\`\`

`
  }

  assertPolymorphicType = function assertPolymorphicType(parentIdentifier, parentDefinition, addedIdentifier, store) {
    if (parentDefinition.inverseIsImplicit) {
      return;
    }
    if (parentDefinition.isPolymorphic) {
      let meta = store.getSchemaDefinitionService().relationshipsDefinitionFor(addedIdentifier)[
        parentDefinition.inverseKey
      ];
      assert(`No '${parentDefinition.inverseKey}' field exists on '${addedIdentifier.type}'. To use this type in the polymorphic relationship '${parentDefinition.inverseType}.${parentDefinition.key}' the relationships schema definition for ${addedIdentifier.type} should include:${expectedSchema(parentDefinition)}`, meta);
      assert(
        `You should not specify both options.as and options.inverse as null on ${addedIdentifier.type}.${parentDefinition.inverseKey}, as if there is no inverse field there is no abstract type to conform to. You may have intended for this relationship to be polymorphic, or you may have mistakenly set inverse to null.`,
        !(meta.options.inverse === null && meta?.options.as?.length > 0)
      );
      let errors = validateSchema(parentDefinition, meta);
      assert(
        `The schema for the relationship '${parentDefinition.inverseKey}' on '${addedIdentifier.type}' type does not correctly implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. If using this record in this polymorphic relationship is desired, correct the errors in the schema shown below:${printSchema(meta, errors)}`,
        errors.size === 0,
      );
    } else {
      // if we are not polymorphic
      // then the addedIdentifier.type must be the same as the parentDefinition.type
      assert(`The '${addedIdentifier.type}' type does not implement '${parentDefinition.type}' and thus cannot be assigned to the '${parentDefinition.key}' relationship in '${parentIdentifier.type}'. If this relationship should be polymorphic, mark ${parentDefinition.inverseType}.${parentDefinition.key} as \`polymorphic: true\` and ${addedIdentifier.type}.${parentDefinition.inverseKey} as implementing it via \`as: '${parentDefinition.type}'\`.`, addedIdentifier.type === parentDefinition.type);
    }

    if (false) {
      store = store._store ? store._store : store; // allow usage with storeWrapper
      let addedModelName = addedIdentifier.type;
      let parentModelName = parentIdentifier.type;
      let key = parentDefinition.key;
      let relationshipModelName = parentDefinition.type;
      let relationshipClass = store.modelFor(relationshipModelName);
      let addedClass = store.modelFor(addedModelName);

      let assertionMessage = `The '${addedModelName}' type does not implement '${relationshipModelName}' and thus cannot be assigned to the '${key}' relationship in '${parentModelName}'. Make it a descendant of '${relationshipModelName}' or use a mixin of the same name.`;
      let isPolymorphic = checkPolymorphic(relationshipClass, addedClass);

      assert(assertionMessage, isPolymorphic);
    }
  };
}

export { assertPolymorphicType };
