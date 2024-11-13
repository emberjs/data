import type { SchemaService } from '@ember-data/store/types';
import type { LegacyBelongsToField, LegacyHasManyField } from '@warp-drive/core-types/schema/fields';
import type {
  CollectionResourceDocument,
  ExistingResourceIdentifierObject,
  ExistingResourceObject,
  InnerRelationshipDocument,
  SingleResourceDocument,
} from '@warp-drive/core-types/spec/json-api-raw';

export function validateDocumentFields(
  schema: SchemaService,
  jsonApiDoc: SingleResourceDocument | CollectionResourceDocument
) {
  const { data, included } = jsonApiDoc;
  if (data === null) {
    return;
  }

  if (Array.isArray(data)) {
    for (const resource of data) {
      validateResourceFields(schema, resource, { verifyIncluded: true, included });
    }
  } else {
    validateResourceFields(schema, data, { verifyIncluded: true, included });
  }

  if (included) {
    for (const resource of included) {
      validateResourceFields(schema, resource, { verifyIncluded: false });
    }
  }
}

type ValidateResourceFieldsOptions =
  | {
      verifyIncluded: true;
      included: ExistingResourceObject[] | undefined;
    }
  | {
      verifyIncluded: false;
    };

function validateResourceFields(
  schema: SchemaService,
  resource: ExistingResourceObject,
  options: ValidateResourceFieldsOptions
) {
  if (!resource.relationships) {
    return;
  }

  const resourceType = resource.type;
  const fields = schema.fields({ type: resource.type });
  for (const [type, relationshipDoc] of Object.entries(resource.relationships)) {
    const field = fields.get(type);
    if (!field) {
      return;
    }
    switch (field.kind) {
      case 'belongsTo': {
        if (field.options.linksMode) {
          validateBelongsToLinksMode(resourceType, field, relationshipDoc, options);
        }
        break;
      }
      case 'hasMany': {
        if (field.options.linksMode) {
          validateHasManyToLinksMode(resourceType, field, relationshipDoc, options);
        }
        break;
      }
      default:
        break;
    }
  }
}

function validateBelongsToLinksMode(
  resourceType: string,
  field: LegacyBelongsToField,
  relationshipDoc: InnerRelationshipDocument<ExistingResourceIdentifierObject>,
  options: ValidateResourceFieldsOptions
) {
  if (field.options.async) {
    throw new Error(
      `Cannot fetch ${resourceType}.${field.name} because the field is in linksMode but async is not yet supported`
    );
  }

  if (!relationshipDoc.links?.related) {
    throw new Error(
      `Cannot fetch ${resourceType}.${field.name} because the field is in linksMode but the related link is missing`
    );
  }

  const relationshipData = relationshipDoc.data;
  if (Array.isArray(relationshipData)) {
    throw new Error(
      `Cannot fetch ${resourceType}.${field.name} because the relationship data for a belongsTo relationship is unexpectedly an array`
    );
  }
  // Explicitly allow `null`! Missing key or `undefined` are always invalid.
  if (relationshipData === undefined) {
    throw new Error(
      `Cannot fetch ${resourceType}.${field.name} because the field is in linksMode but the relationship data is undefined`
    );
  }
  if (relationshipData === null) {
    return;
  }

  if (!options.verifyIncluded) {
    return;
  }
  const includedDoc = options.included?.find(
    (doc) => doc.type === relationshipData.type && doc.id === relationshipData.id
  );
  if (!includedDoc) {
    throw new Error(
      `Cannot fetch ${resourceType}.${field.name} because the field is in linksMode but the related data is not included`
    );
  }
}

function validateHasManyToLinksMode(
  resourceType: string,
  field: LegacyHasManyField,
  _relationshipDoc: InnerRelationshipDocument<ExistingResourceIdentifierObject>,
  _options: ValidateResourceFieldsOptions
) {
  throw new Error(
    `Cannot fetch ${resourceType}.${field.name} because the field is in linksMode but hasMany is not yet supported`
  );
}
