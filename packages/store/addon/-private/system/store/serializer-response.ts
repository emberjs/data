import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { RecordInstance } from '../../ts-interfaces/record-instance';

type RequestType = import('../../ts-interfaces/minimum-serializer-interface').RequestType;
type AdapterPayload = import('../../ts-interfaces/minimum-adapter-interface').AdapterPayload;
type ShimModelClass = import('../model/shim-model-class').default;
type CoreStore<K> = import('../core-store').default<K>;
type DSModelSchema = import('../../ts-interfaces/ds-model').DSModelSchema;
type MinimumSerializerInterface<K> = import('../../ts-interfaces/minimum-serializer-interface').MinimumSerializerInterface<K>;
type JsonApiDocument = import('../../ts-interfaces/ember-data-json-api').JsonApiDocument;

/**
  This is a helper method that validates a JSON API top-level document

  The format of a document is described here:
  http://jsonapi.org/format/#document-top-level

  @internal
*/
export function validateDocumentStructure(doc: JsonApiDocument) {
  let errors: string[] = [];
  if (!doc || typeof doc !== 'object') {
    errors.push('Top level of a JSON API document must be an object');
  } else {
    if (!('data' in doc) && !('errors' in doc) && !('meta' in doc)) {
      errors.push('One or more of the following keys must be present: "data", "errors", "meta".');
    } else {
      if ('data' in doc && 'errors' in doc) {
        errors.push('Top level keys "errors" and "data" cannot both be present in a JSON API document');
      }
    }
    if ('data' in doc) {
      if (!(doc.data === null || Array.isArray(doc.data) || typeof doc.data === 'object')) {
        errors.push('data must be null, an object, or an array');
      }
    }
    if ('meta' in doc) {
      if (typeof doc.meta !== 'object') {
        errors.push('meta must be an object');
      }
    }
    if ('errors' in doc) {
      if (!Array.isArray(doc.errors)) {
        errors.push('errors must be an array');
      }
    }
    if ('links' in doc) {
      if (typeof doc.links !== 'object') {
        errors.push('links must be an object');
      }
    }
    if ('jsonapi' in doc) {
      if (typeof doc.jsonapi !== 'object') {
        errors.push('jsonapi must be an object');
      }
    }
    if ('included' in doc) {
      if (typeof doc.included !== 'object') {
        errors.push('included must be an array');
      }
    }
  }

  return errors;
}

export function normalizeResponseHelper<K extends RecordInstance>(
  serializer: MinimumSerializerInterface<K>,
  store: CoreStore<K>,
  modelClass: ShimModelClass | DSModelSchema,
  payload: AdapterPayload,
  id: string | null,
  requestType: RequestType
) {
  let normalizedResponse = serializer.normalizeResponse(store, modelClass, payload, id, requestType);
  if (DEBUG) {
    let validationErrors = validateDocumentStructure(normalizedResponse);
    assert(
      `normalizeResponse must return a valid JSON API document:\n\t* ${validationErrors.join('\n\t* ')}`,
      validationErrors.length === 0
    );
  }

  return normalizedResponse;
}
