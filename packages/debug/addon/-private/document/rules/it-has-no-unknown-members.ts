import { DocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';

import { IValidationContext } from 'ember-data';

const AT_LEAST_ONE = ['data', 'meta', 'errors'];

const OPTIONAL_KEYS = ['jsonapi', 'links', 'included'];

/**
 *
 * @param validator
 * @param document
 * @param issues
 * @param path
 * @returns {boolean}
 */
export default function itHasNoUnknownMembers({
  validator,
  document,
  issues,
  path,
}: IValidationContext) {
  let { warnings, errors } = issues;
  let { strictMode } = validator;
  let hasError = false;

  Object.keys(document).forEach(key => {
    if (OPTIONAL_KEYS.indexOf(key) === -1 && AT_LEAST_ONE.indexOf(key) === -1) {
      let issue = new DocumentError({
        code: DOCUMENT_ERROR_TYPES.UNKNOWN_MEMBER,
        document,
        path,
        validator,
        value: key,
      });

      strictMode === true ? errors.push(issue) : warnings.push(issue);
      hasError = true;
    }
  });

  return strictMode === true || !hasError;
}
