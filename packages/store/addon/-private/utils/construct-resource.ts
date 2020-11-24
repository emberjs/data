import coerceId from '../system/coerce-id';
import isNonEmptyString from './is-non-empty-string';

type ResourceIdentifierObject = import('../ts-interfaces/ember-data-json-api').ResourceIdentifierObject;

export default function constructResource(
  type: string,
  id?: string | number | null,
  lid?: string | null
): ResourceIdentifierObject {
  const trueId = coerceId(id);
  if (!isNonEmptyString(trueId)) {
    if (isNonEmptyString(lid)) {
      return { type, id: trueId, lid };
    }
    throw new Error(`Expected either id or lid to be a valid string`);
  }

  if (isNonEmptyString(lid)) {
    return { type, id: trueId, lid };
  }

  return { type, id: trueId };
}
