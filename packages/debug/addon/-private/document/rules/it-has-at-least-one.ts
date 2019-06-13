import { createDocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import memberDefined from '../../-utils/member-defined';
import { ValidationIssues } from '../types';

const AT_LEAST_ONE = ['data', 'errors'];

interface ValidationContext {
  issues: ValidationIssues;
  path: string;
}

interface DataMemberDocument {
  data: unknown;
}
interface ErrorsMemberDocument {
  errors: unknown;
}
type DocumentWithRequiredMember = DataMemberDocument | ErrorsMemberDocument;

/**
 * Validates that a document has at least one of
 * the following keys: `data`, and `errors`.
 *
 * While `meta` is valid in `JSON:API` we do not
 * allow for this in `ember-data` as a stand-alone
 * document.
 *
 */
export default function itHasAtLeastOne(
  document: object,
  { issues, path }: ValidationContext
): document is DocumentWithRequiredMember {
  let { errors } = issues;

  for (let i = 0; i < AT_LEAST_ONE.length; i++) {
    let neededKey = AT_LEAST_ONE[i];

    if (memberDefined(document, neededKey)) {
      return true;
    }
  }

  errors.push(
    createDocumentError({
      document,
      path,
      code: DOCUMENT_ERROR_TYPES.MISSING_MANDATORY_MEMBER,
      value: AT_LEAST_ONE,
    })
  );

  return false;
}
