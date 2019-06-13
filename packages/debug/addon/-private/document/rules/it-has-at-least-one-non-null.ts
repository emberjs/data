import { DocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import memberDefined from '../utils/member-defined';
import memberDefinedAndNotNull from '../utils/member-defined-and-not-null';

import { IValidationContext } from 'ember-data';

const AT_LEAST_ONE = ['data', 'meta', 'errors'];

/**
 * Validates that a document has at least one of
 * the following keys: `data`, `meta`, and `errors`
 * and that the key is non-null
 *
 * @param validator
 * @param document
 * @param issues
 * @param path
 */
export default function itHasAtLeastOneNonNull({
  validator,
  document,
  issues,
  path,
}: IValidationContext) {
  let { errors } = issues;
  let nullMembers = [];

  for (let i = 0; i < AT_LEAST_ONE.length; i++) {
    let neededKey = AT_LEAST_ONE[i];

    if (memberDefinedAndNotNull(document, neededKey)) {
      return true;
      // possibly should be a presence check not a defined check
    } else if (memberDefined(document, neededKey)) {
      nullMembers.push(neededKey);
    }
  }

  if (nullMembers.length) {
    errors.push(
      new DocumentError({
        document,
        path,
        code: DOCUMENT_ERROR_TYPES.NULL_MANDATORY_MEMBER,
        validator,
        key: nullMembers,
        value: AT_LEAST_ONE,
      })
    );
  }

  return false;
}
