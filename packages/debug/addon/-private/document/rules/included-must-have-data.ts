import { DocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import memberPresent from '../utils/member-present';
import memberDefined from '../utils/member-defined';

import { IValidationContext } from 'ember-data';

/**
 * Spec: http://jsonapi.org/format/#document-top-level
 *
 * @param validator
 * @param document
 * @param issues
 * @param path
 * @returns {boolean}
 */
export default function includedMustHaveData({ validator, document, issues, path }: IValidationContext) {
  let { errors } = issues;

  if (memberPresent(document, 'included') && !memberDefined(document, 'data')) {
    let issue = new DocumentError({
      code: DOCUMENT_ERROR_TYPES.DISALLOWED_INCLUDED_MEMBER,
      path,
      document,
      validator,
      value: 'included'
    });

    errors.push(issue);

    return false;
  }

  return true;
}
