import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import type Store from '@ember-data/store';
import type ShimModelClass from '@ember-data/store/-private/legacy-model-support/shim-model-class';
import type { JsonApiDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { AdapterPayload } from '@ember-data/types/q/minimum-adapter-interface';
import type { MinimumSerializerInterface, RequestType } from '@ember-data/types/q/minimum-serializer-interface';

export function iterateData<T>(data: T[] | T, fn: (o: T, index?: number) => T) {
  if (Array.isArray(data)) {
    return data.map(fn);
  } else {
    return fn(data);
  }
}

export function assertIdentifierHasId(
  identifier: StableRecordIdentifier
): asserts identifier is StableExistingRecordIdentifier {
  assert(`Attempted to schedule a fetch for a record without an id.`, identifier.id !== null);
}

export function normalizeResponseHelper(
  serializer: MinimumSerializerInterface | null,
  store: Store,
  modelClass: ShimModelClass,
  payload: AdapterPayload,
  id: string | null,
  requestType: RequestType
): JsonApiDocument {
  let normalizedResponse = serializer
    ? serializer.normalizeResponse(store, modelClass, payload, id, requestType)
    : payload;

  validateDocumentStructure(normalizedResponse);

  return normalizedResponse;
}

export function validateDocumentStructure(doc?: AdapterPayload | JsonApiDocument): asserts doc is JsonApiDocument {
  if (DEBUG) {
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

    assert(
      `Response must be normalized to a valid JSON API document:\n\t* ${errors.join('\n\t* ')}`,
      errors.length === 0
    );
  }
}
