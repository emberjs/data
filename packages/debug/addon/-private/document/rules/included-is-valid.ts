import { DocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import memberDefined from '../utils/member-defined';
import validateResource from '../validate-resource';

import { IValidationContext } from 'ember-data';

/**
 * The `included` key of a json-api document MUST be an Array if present and MUST contain only
 * resource-objects (Resource).
 *
 * Every resource-object in included MUST be linked to
 * by another resource-object within the payload, see:
 *
 * http://jsonapi.org/format/#document-compound-documents
 *
 * However, exceptions are made for for sparse fieldsets
 * which makes this difficult to enforce.
 *
 * @param validator
 * @param document
 * @param errors
 * @param path
 * @returns {boolean}
 */
export default function includedIsValid({ validator, document, issues, path }: IValidationContext) {
  if (!memberDefined(document, 'included')) {
    return true;
  }

  if (Array.isArray(document.included)) {
    let hasError = false;
    document.included.forEach((resource, i) => {
      let didError = validateResource({
        validator,
        document,
        target: resource,
        issues,
        path: `${path}.included[${i}]`
      });

      hasError = hasError || didError;
    });

    return hasError;
  }

  issues.errors.push(new DocumentError({
    validator,
    document,
    path,
    value: document.included,
    member: 'included',
    code: DOCUMENT_ERROR_TYPES.INVALID_INCLUDED_VALUE
  }));

  return false;
}
