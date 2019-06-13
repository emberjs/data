import itExists from './rules/it-exists';
import itHasAtLeastOne from './rules/it-has-at-least-one';
import itHasAtLeastOneNonNull from './rules/it-has-at-least-one-non-null';
import isErrorDocument from './rules/is-error-document';
import itCantHaveBoth from './rules/it-cant-have-both';
import itHasNoUnknownMembers from './rules/it-has-no-unknown-members';
import includedMustHaveData from './rules/included-must-have-data';
import dataIsValid from './rules/data-is-valid';
import includedIsValid from './rules/included-is-valid';
import validateJsonapiMember from './validate-jsonapi-member';
// import validateMeta from './validate-meta';
// import validateLinks from './validate-links';
// import itHasValidErrors from './document-rules/it-has-valid-errors';

import { ValidationIssues, ValidationContext } from './types';

/**
 * Validate that a json-api document conforms to spec
 *
 *  Spec: http://jsonapi.org/format/#document-top-level
 *
 * @param validator
 * @param document
 *
 * @returns {Object} an object with arrays of `errors` and `warnings`.
 */
export default function validateDocument(schema, document: unknown) {
  let issues: ValidationIssues = {
    errors: [],
    warnings: [],
  };
  let path = '<document>';

  if (itExists(document, { issues, path })) {
    if (isErrorDocument(document, { issues, path })) {
      // validateErrors(document, { issues, path });
    } else {
    }

    // validateLinks(document, { issues, path });
    // validateMeta(document, { issues, path });
    validateJsonapiMember(document, { issues, path });
  }

  return issues;
}
