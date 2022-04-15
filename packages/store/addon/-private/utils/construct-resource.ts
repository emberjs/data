import { assert } from '@ember/debug';

import isStableIdentifier from '../identifiers/is-stable-identifier';
import coerceId from '../system/coerce-id';
import type { ExistingResourceIdentifierObject, ResourceIdentifierObject } from '../ts-interfaces/ember-data-json-api';
import isNonEmptyString from './is-non-empty-string';

function constructResource(type: ResourceIdentifierObject): ResourceIdentifierObject;
function constructResource(type: string, id: string, lid: string): ExistingResourceIdentifierObject;
function constructResource(
  type: string | undefined,
  id: null | undefined,
  lid: string
): ExistingResourceIdentifierObject;
function constructResource(type: string, id: string, lid?: string | null): ExistingResourceIdentifierObject;
function constructResource(type: string, id?: string | number | null, lid?: string | null): ResourceIdentifierObject;
function constructResource(
  type: string | ResourceIdentifierObject | undefined,
  id?: string | number | null,
  lid?: string | null
): ResourceIdentifierObject | ExistingResourceIdentifierObject {
  if (typeof type === 'object' && type !== null) {
    let resource = type;
    if (isStableIdentifier(resource)) {
      return resource;
    }
    if ('id' in resource) {
      resource.id = coerceId(resource.id);
    }

    assert(
      'Expected either id or lid to be a valid string',
      ('id' in resource && isNonEmptyString(resource.id)) || isNonEmptyString(resource.lid)
    );
    assert('if id is present, the type must be a string', !('id' in resource) || typeof resource.type === 'string');

    return resource;
  } else {
    const trueId = coerceId(id);
    if (!isNonEmptyString(trueId)) {
      if (isNonEmptyString(lid)) {
        return { lid };
      }
      throw new Error('Expected either id or lid to be a valid string');
    }

    assert('type must be a string', typeof type === 'string');

    if (isNonEmptyString(lid)) {
      return { type, id: trueId, lid };
    }

    return { type, id: trueId };
  }
}

export default constructResource;
