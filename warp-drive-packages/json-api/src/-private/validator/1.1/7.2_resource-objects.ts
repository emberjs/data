import type { ResourceDocument } from '@warp-drive/core/types/spec/document';

import {
  getRemoteField,
  inspectType,
  isSimpleObject,
  logPotentialMatches,
  type PathLike,
  RELATIONSHIP_FIELD_KINDS,
  type Reporter,
} from '../utils';
import { validateLinks } from './links';

const SINGULAR_OPS = ['createRecord', 'updateRecord', 'deleteRecord', 'findRecord', 'queryRecord'];

/**
 * Validates the resource objects in either the `data` or `included` members of
 * JSON:API document.
 *
 * Version: 1.1
 * Section: 7.2
 * Link: https://jsonapi.org/format/#document-resource-objects
 *
 * @internal
 */
export function validateDocumentResources(reporter: Reporter, doc: ResourceDocument): void {
  if ('data' in doc) {
    // scan for common mistakes of single vs multiple resource objects
    const op = reporter.contextDocument.request?.op;
    if (op && SINGULAR_OPS.includes(op)) {
      if (Array.isArray(doc.data)) {
        reporter.error(
          ['data'],
          `"${op}" requests expect a single resource object in the returned data, but received an array`
        );
      }
    }

    // guard for a common mistake around deleteRecord
    if (op === 'deleteRecord') {
      if (doc.data !== null) {
        reporter.warn(
          ['data'],
          `"deleteRecord" requests expect the data member to be null, but received ${inspectType(doc.data)}. This can sometimes cause unexpected resurrection of the deleted record.`
        );
      }
    }

    if (Array.isArray(doc.data)) {
      doc.data.forEach((resource, index) => {
        if (!isSimpleObject(resource)) {
          reporter.error(['data', index], `Expected a resource object, but received ${inspectType(resource)}`);
        } else {
          validateResourceObject(reporter, resource, ['data', index]);
        }
      });
    } else if (doc.data !== null) {
      if (!isSimpleObject(doc.data)) {
        reporter.error(['data'], `Expected a resource object, but received ${inspectType(doc.data)}`);
      } else {
        validateResourceObject(reporter, doc.data, ['data']);
      }
    }
  }

  if ('included' in doc && Array.isArray(doc.included)) {
    doc.included.forEach((resource, index) => {
      if (!isSimpleObject(resource)) {
        reporter.error(['included', index], `Expected a resource object, but received ${inspectType(resource)}`);
      } else {
        validateResourceObject(reporter, resource, ['included', index]);
      }
    });
  }
}

function validateResourceObject(reporter: Reporter, resource: Record<string, unknown>, path: PathLike) {
  validateTopLevelResourceShape(reporter, resource, path);
}

const VALID_TOP_LEVEL_RESOURCE_KEYS = ['lid', 'id', 'type', 'attributes', 'relationships', 'meta', 'links'];
function validateTopLevelResourceShape(reporter: Reporter, resource: Record<string, unknown>, path: PathLike) {
  // a resource MUST have a string type
  if (!('type' in resource)) {
    reporter.error([...path, 'type'], `Expected a ResourceObject to have a type property`);
  } else if (typeof resource.type !== 'string') {
    reporter.error(
      [...path, 'type'],
      `Expected a string value for the type property, but received ${inspectType(resource.type)}`,
      'value'
    );
  } else if (resource.type.length === 0) {
    reporter.error(
      [...path, 'type'],
      `Expected a non-empty string value for the type property, but received an empty string`,
      'value'
    );
  } else if (!reporter.schema.hasResource({ type: resource.type })) {
    const method = reporter.strict.unknownType ? 'error' : 'warn';
    const potentialTypes = reporter.searchTypes(resource.type);
    reporter[method](
      [...path, 'type'],
      `Expected a schema to be available for the ResourceType "${resource.type}" but none was found.${logPotentialMatches(potentialTypes, 'ResourceType')}`,
      'value'
    );
  }

  // a resource MUST have a string ID
  if (!('id' in resource)) {
    reporter.error([...path, 'id'], `Expected a ResourceObject to have an id property`);
  } else if (typeof resource.id !== 'string') {
    reporter.error(
      [...path, 'id'],
      `Expected a string value for the id property, but received ${inspectType(resource.id)}`,
      'value'
    );
  } else if (resource.id.length === 0) {
    reporter.error(
      [...path, 'id'],
      `Expected a non-empty string value for the id property, but received an empty string`,
      'value'
    );
  }

  // a resource MAY have a lid property
  if ('lid' in resource && typeof resource.lid !== 'string') {
    reporter.error(
      [...path, 'lid'],
      `Expected a string value for the lid property, but received ${inspectType(resource.lid)}`,
      'value'
    );
  } else {
    // We MAY want to validate in the future that the lid is a valid local ID
    // and not just a string. For now, we will just check that it is a string.
  }

  // a resource MAY have a meta property
  if ('meta' in resource && !isSimpleObject(resource.meta)) {
    reporter.error(
      [...path, 'meta'],
      `Expected a simple object for the meta property, but received ${inspectType(resource.meta)}`,
      'value'
    );
  }

  // a resource MAY have a links property
  if ('links' in resource && !isSimpleObject(resource.links)) {
    reporter.error(
      [...path, 'links'],
      `Expected a simple object for the links property, but received ${inspectType(resource.links)}`,
      'value'
    );
  } else if ('links' in resource) {
    validateLinks(reporter, resource, 'resource', [...path, 'links']);
  }

  const hasAttributes = 'attributes' in resource && isSimpleObject(resource.attributes);
  const hasRelationships = 'relationships' in resource && isSimpleObject(resource.relationships);

  // We expect at least one of attributes or relationships to be present
  if (!hasAttributes && !hasRelationships) {
    reporter.warn(path, `Expected a ResourceObject to have either attributes or relationships`);
  }

  // we expect at least one of attributes or relationships to be non-empty
  const attributesLength = hasAttributes ? Object.keys(resource.attributes as object).length : 0;
  const relationshipsLength = hasRelationships ? Object.keys(resource.relationships as object).length : 0;

  if ((hasAttributes || hasRelationships) && attributesLength === 0 && relationshipsLength === 0) {
    reporter.warn(
      [...path, hasAttributes ? 'attributes' : hasRelationships ? 'relationships' : 'attributes'],
      `Expected a ResourceObject to have either non-empty attributes or non-empty relationships`
    );
  }

  // check for unknown keys on the resource object
  const keys = Object.keys(resource);
  for (const key of keys) {
    if (!VALID_TOP_LEVEL_RESOURCE_KEYS.includes(key)) {
      // check for extension keys
      if (key.includes(':')) {
        const extensionName = key.split(':')[0];
        if (reporter.hasExtension(extensionName)) {
          const extension = reporter.getExtension(extensionName)!;
          extension(reporter, [...path, key]);
        } else {
          reporter.warn(
            [...path, key],
            `Unrecognized extension ${extensionName}. The data provided by "${key}" will be ignored as it is not a valid {json:api} ResourceObject member`
          );
        }
      } else {
        // check if this is an attribute or relationship
        let didYouMean = '  Likely this field should have been inside of either "attributes" or "relationships"';

        const type = 'type' in resource ? (resource.type as string) : undefined;
        if (type && reporter.schema.hasResource({ type })) {
          const fields = reporter.schema.fields({ type });
          const field = getRemoteField(fields, key);

          if (field) {
            const isRelationship = RELATIONSHIP_FIELD_KINDS.includes(field.kind);
            didYouMean = `  Based on the ResourceSchema for "${type}" this field is likely a ${field.kind} and belongs inside of ${isRelationship ? 'relationships' : 'attributes'}, e.g. "${isRelationship ? 'relationships' : 'attributes'}": { "${key}": { ... } }`;
          } else {
            const fieldMatches = reporter.searchFields(type, key);

            if (fieldMatches.length === 1) {
              const matchedField = fields.get(fieldMatches[0].item)!;
              const isRelationship = RELATIONSHIP_FIELD_KINDS.includes(matchedField.kind);
              didYouMean = `  Based on the ResourceSchema for "${type}" this field is likely a ${matchedField.kind} and belongs inside of ${isRelationship ? 'relationships' : 'attributes'}, e.g. "${isRelationship ? 'relationships' : 'attributes'}": { "${matchedField.name}": { ... } }`;
            } else if (fieldMatches.length > 1) {
              const matchedField = fields.get(fieldMatches[0].item)!;
              const isRelationship = RELATIONSHIP_FIELD_KINDS.includes(matchedField.kind);
              didYouMean = `  Based on the ResourceSchema for "${type}" this field is likely one of "${fieldMatches.map((v) => v.item).join('", "')}" and belongs inside of either "attributes" or "relationships", e.g. "${isRelationship ? 'relationships' : 'attributes'}": { "${matchedField.name}": { ... } }`;
            }
          }
        }

        reporter.error(
          [...path, key],
          `Unrecognized ResourceObject member. The data it provides is ignored as it is not a valid {json:api} ResourceObject member.${didYouMean}`
        );
      }
    }
  }

  // if we have a schema, validate the individual attributes and relationships
  const type = 'type' in resource ? (resource.type as string) : undefined;
  if (type && reporter.schema.hasResource({ type })) {
    if ('attributes' in resource) {
      validateResourceAttributes(reporter, type, resource.attributes as Record<string, unknown>, [
        ...path,
        'attributes',
      ]);
    }

    if ('relationships' in resource) {
      validateResourceRelationships(reporter, type, resource.relationships as Record<string, unknown>, [
        ...path,
        'relationships',
      ]);
    }
  }
}

function validateResourceAttributes(
  reporter: Reporter,
  type: string,
  resource: Record<string, unknown>,
  path: PathLike
) {
  const schema = reporter.schema.fields({ type });
  for (const [key] of Object.entries(resource)) {
    const field = getRemoteField(schema, key);
    const actualField = schema.get(key);
    if (!field && actualField) {
      reporter.warn(
        [...path, key],
        `Expected the ${actualField.kind} field "${key}" to not have its own data in the ResourceObject's attributes. Likely this field should either not be returned in this payload or the field definition should be updated in the schema.`
      );
    } else if (!field) {
      if (key.includes(':')) {
        const extensionName = key.split(':')[0];
        if (reporter.hasExtension(extensionName)) {
          const extension = reporter.getExtension(extensionName)!;
          extension(reporter, [...path, key]);
        } else {
          reporter.warn(
            [...path, key],
            `Unrecognized extension ${extensionName}. The data provided by "${key}" will be ignored as it is not a valid {json:api} ResourceObject member`
          );
        }
      } else {
        const method = reporter.strict.unknownAttribute ? 'error' : 'warn';

        // TODO @runspired when we check for fuzzy matches we can adjust the message to say
        // whether the expected field is an attribute or a relationship
        const potentialFields = reporter.searchFields(type, key);
        reporter[method](
          [...path, key],
          `Unrecognized attribute. The data it provides is ignored as it is not part of the ResourceSchema for "${type}".${logPotentialMatches(
            potentialFields,
            'field'
          )}`
        );
      }
    } else if (field && RELATIONSHIP_FIELD_KINDS.includes(field.kind)) {
      reporter.error(
        [...path, key],
        `Expected the "${key}" field to be in "relationships" as it has kind "${field.kind}", but received data for it in "attributes".`
      );
    }
  }

  // TODO @runspired we should also deep-validate the field value
  // TODO @runspired we should validate that field values are valid JSON and not instances
}

function validateResourceRelationships(
  reporter: Reporter,
  type: string,
  resource: Record<string, unknown>,
  path: PathLike
) {
  const schema = reporter.schema.fields({ type });
  for (const [key] of Object.entries(resource)) {
    const field = getRemoteField(schema, key);
    const actualField = schema.get(key);
    if (!field && actualField) {
      reporter.warn(
        [...path, key],
        `Expected the ${actualField.kind} field "${key}" to not have its own data in the ResourceObject's relationships. Likely this field should either not be returned in this payload or the field definition should be updated in the schema.`
      );
    } else if (!field) {
      if (key.includes(':')) {
        const extensionName = key.split(':')[0];
        if (reporter.hasExtension(extensionName)) {
          const extension = reporter.getExtension(extensionName)!;
          extension(reporter, [...path, key]);
        } else {
          reporter.warn(
            [...path, key],
            `Unrecognized extension ${extensionName}. The data provided by "${key}" will be ignored as it is not a valid {json:api} ResourceObject member`
          );
        }
      } else {
        const method = reporter.strict.unknownRelationship ? 'error' : 'warn';

        // TODO @runspired when we check for fuzzy matches we can adjust the message to say
        // whether the expected field is an attribute or a relationship
        const potentialFields = reporter.searchFields(type, key);
        reporter[method](
          [...path, key],
          `Unrecognized relationship. The data it provides is ignored as it is not part of the ResourceSchema for "${type}".${logPotentialMatches(
            potentialFields,
            'field'
          )}`
        );
      }
    } else if (field && !RELATIONSHIP_FIELD_KINDS.includes(field.kind)) {
      reporter.error(
        [...path, key],
        `Expected the "${key}" field to be in "attributes" as it has kind "${field.kind}", but received data for it in "relationships".`
      );
    }
  }

  // TODO @runspired we should also deep-validate the relationship payload
  // TODO @runspired we should validate linksMode requirements for both Polaris and Legacy modes
  // TODO @runspired we should warn if the discovered resource-type in a relationship is the abstract
  //   type instead of the concrete type.
}
