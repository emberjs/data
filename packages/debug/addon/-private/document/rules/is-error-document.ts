import { createDocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import memberDefined from '../../-utils/member-defined';
import { ValidationIssues } from '../types';

interface ValidationContext {
  issues: ValidationIssues;
  path: string;
}

interface ErrorsMemberDocument {
  errors: unknown;
  jsonapi?: unknown;
  links?: unknown;
  meta?: unknown;
}

const OPTIONAL_MEMBERS = ['jsonapi', 'links', 'meta'];
const INVALID_MEMBERS = ['data', 'included'];

/**
 * Determines whether a document has an `errors` property
 * and if so validates that
 *
 * - errors is an array
 * - `data` and `included` members are not present
 *
 * While `meta` is valid in `JSON:API` we do not
 * allow for this in `ember-data` as a stand-alone
 * document.
 *
 */
export default function isErrorDocument(
  document: { errors?: unknown },
  { issues, path }: ValidationContext
): document is ErrorsMemberDocument {
  let { errors } = issues;

  if (memberDefined(document, 'errors')) {
    if (!Array.isArray(document.errors)) {
      errors.push(
        createDocumentError({
          document,
          path,
          code: DOCUMENT_ERROR_TYPES.MEMBER_MUST_BE_ARRAY,
          value: document.errors,
        })
      );
    }
    Object.keys(document).forEach(member => {
      if (member === 'errors') {
        return;
      }
      if (OPTIONAL_MEMBERS.includes(member)) {
        return;
      }
      if (INVALID_MEMBERS.includes(member)) {
        errors.push(
          createDocumentError({
            document,
            path,
            code: DOCUMENT_ERROR_TYPES.DISALLOWED_MEMBER_FOR_ERRORS,
            value: member,
          })
        );
        return;
      }
      errors.push(
        createDocumentError({
          code: DOCUMENT_ERROR_TYPES.UNKNOWN_MEMBER,
          document,
          path,
          value: member,
        })
      );
    });
    return true;
  }

  return false;
}
