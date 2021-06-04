import { assert } from '@ember/debug';

import isStableIdentifier from '../identifiers/is-stable-identifier';
import coerceId from '../system/coerce-id';
import isNonEmptyString from './is-non-empty-string';

type ModelRegistry = import('@ember-data/store/-private/ts-interfaces/registries').ModelRegistry;
type ResourceIdentifierObject = import('../ts-interfaces/ember-data-json-api').ResourceIdentifierObject;
type ExistingResourceIdentifierObject = import('../ts-interfaces/ember-data-json-api').ExistingResourceIdentifierObject;

function constructResource(type: ResourceIdentifierObject): ResourceIdentifierObject;
function constructResource(type: keyof ModelRegistry, id: string, lid: string): ExistingResourceIdentifierObject;
function constructResource(
  type: keyof ModelRegistry | undefined,
  id: null | undefined,
  lid: string
): ExistingResourceIdentifierObject;
function constructResource(
  type: keyof ModelRegistry,
  id: string,
  lid?: string | null
): ExistingResourceIdentifierObject;
function constructResource(
  type: keyof ModelRegistry,
  id?: string | number | null,
  lid?: string | null
): ResourceIdentifierObject;
function constructResource(
  type: keyof ModelRegistry | ResourceIdentifierObject | undefined,
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
