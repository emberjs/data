import { DocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import memberPresent from '../utils/member-present';

import { IValidationContext } from 'ember-data';

/**
 * Validates that a document does not have both data and errors
 *
 * @param validator
 * @param document
 * @param issues
 * @param path
 */
export default function itCantHaveBoth({ validator, document, issues, path }: IValidationContext) {
  let { errors } = issues;

  if (memberPresent(document, 'data') && memberPresent(document, 'errors')) {
    errors.push(
      new DocumentError({
        document,
        path,
        code: DOCUMENT_ERROR_TYPES.DISALLOWED_DATA_MEMBER,
        validator,
        value: ['data', 'errors'],
      })
    );

    return false;
  }

  return true;
}
