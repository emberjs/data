import type { ResourceDocument } from '@warp-drive/core-types/spec/document';

import { inspectType, isSimpleObject, type Reporter } from '../utils';
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
export function validateDocumentResources(reporter: Reporter, doc: ResourceDocument) {
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
          reporter.error(['data', String(index)], `Expected a resource object, but received ${inspectType(resource)}`);
        } else {
          validateResourceObject(reporter, resource, ['data', String(index)]);
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
        reporter.error(
          ['included', String(index)],
          `Expected a resource object, but received ${inspectType(resource)}`
        );
      } else {
        validateResourceObject(reporter, resource, ['included', String(index)]);
      }
    });
  }
}

function validateResourceObject(reporter: Reporter, resource: Record<string, unknown>, path: string[]) {
  validateTopLevelResourceShape(reporter, resource, path);
}

const VALID_TOP_LEVEL_RESOURCE_KEYS = ['lid', 'id', 'type', 'attributes', 'relationships', 'meta', 'links'];
function validateTopLevelResourceShape(reporter: Reporter, resource: Record<string, unknown>, path: string[]) {
  // a resource MUST have a string type
  if (!('type' in resource)) {
    reporter.error(path, `Expected a ResourceObjectto have a type property`);
  } else if (typeof resource.type !== 'string') {
    reporter.error(
      [...path, 'type'],
      `Expected a string value for the type property, but received ${inspectType(resource.type)}`
    );
  } else if (resource.type.length === 0) {
    reporter.error(
      [...path, 'type'],
      `Expected a non-empty string value for the type property, but received an empty string`
    );
  } else if (!reporter.schema.hasResource({ type: resource.type })) {
    const method = reporter.strict.unknownType ? 'error' : 'warn';
    reporter[method](
      [...path, 'type'],
      `Expected a schema to be available for the resource type "${resource.type}" but none was found`
    );
  }

  // a resource MUST have a string ID
  if (!('id' in resource)) {
    reporter.error(path, `Expected a resource object to have an id property`);
  } else if (typeof resource.id !== 'string') {
    reporter.error(
      [...path, 'id'],
      `Expected a string value for the id property, but received ${inspectType(resource.id)}`
    );
  } else if (resource.id.length === 0) {
    reporter.error(
      [...path, 'id'],
      `Expected a non-empty string value for the id property, but received an empty string`
    );
  }

  // a resource MAY have a lid property
  if ('lid' in resource && typeof resource.lid !== 'string') {
    reporter.error(
      [...path, 'lid'],
      `Expected a string value for the lid property, but received ${inspectType(resource.lid)}`
    );
  } else {
    // We MAY want to validate in the future that the lid is a valid local ID
    // and not just a string. For now, we will just check that it is a string.
  }

  // a resource MAY have a meta property
  if ('meta' in resource && !isSimpleObject(resource.meta)) {
    reporter.error(
      [...path, 'meta'],
      `Expected a simple object for the meta property, but received ${inspectType(resource.meta)}`
    );
  }

  // a resource MAY have a links property
  if ('links' in resource && !isSimpleObject(resource.links)) {
    reporter.error(
      [...path, 'links'],
      `Expected a simple object for the links property, but received ${inspectType(resource.links)}`
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

  if (attributesLength === 0 && relationshipsLength === 0) {
    reporter.warn(
      [...path, hasAttributes ? 'attributes' : hasRelationships ? 'relationships' : 'attributes'],
      `Expected a ResourceObject to have either attributes or relationships`
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
            `Unrecognized extension ${extensionName}. The data provided by "${key}" will be ignored as it is not a valid {JSON:API} ResourceObject member`
          );
        }
      } else {
        reporter.error(
          [...path, key],
          `Unrecognized ResourceObject member. The data it provides is ignored as it is not a valid {JSON:API} ResourceObject member`
        );
      }
    }
  }

  // if we have a schema, validate the attributes and relationships
  // validate linksMode requirements
  // validate polymorphic requirements
  // fuzzy-search missing/unexpected keys
  // fuzzy-search missing/unexpected resource-types
  // FIXME
}
