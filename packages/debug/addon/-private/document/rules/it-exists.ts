import { createDocumentError, DOCUMENT_ERROR_TYPES } from '../errors/document-error';
import { ValidationIssues } from '../types';
import isPlainObject from '../../-utils/is-plain-object';

interface ValidationContext {
  issues: ValidationIssues;
  path: string;
}

export default function documentExists(
  document: unknown,
  { issues, path }: ValidationContext
): document is object {
  let { errors } = issues;

  if (!isPlainObject(document)) {
    errors.push(
      createDocumentError({
        document,
        path,
        code: DOCUMENT_ERROR_TYPES.INVALID_DOCUMENT,
        value: typeof document,
      })
    );

    return false;
  }

  return true;
}
