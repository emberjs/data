import { MetaError, META_ERROR_TYPES } from './errors/meta-error';
import memberPresent from '../-utils/member-present';
import isPlainObject from '../-utils/is-plain-object';
import itHasRequiredSibling from './meta-rules/it-has-required-sibling';

/**
 *
 * @param validator
 * @param isRelationship
 * @param document
 * @param target
 * @param issues
 * @param path
 * @returns {boolean}
 */
export default function validateObjectMeta({
  validator,
  isRelationship = false,
  document,
  target,
  issues,
  path,
}) {
  let { errors } = issues;

  if (memberPresent(target, 'meta')) {
    let hasError = false;

    if (target === document && validator.disallowMetaOnlyDocuments()) {
      hasError = itHasRequiredSibling({
        validator,
        document,
        target,
        issues,
        path,
        requiredSiblings: ['data', 'errors'],
      });
    } else if (isRelationship && validator.disallowMetaOnlyRelationships()) {
      hasError = itHasRequiredSibling({
        validator,
        document,
        target,
        issues,
        path,
        requiredSiblings: ['data', 'links'],
      });
    }

    if (!isPlainObject(target.meta)) {
      errors.push(
        new MetaError({
          code: META_ERROR_TYPES.VALUE_MUST_BE_OBJECT,
          value: target.meta,
          target,
          member: 'meta',
          validator,
          document,
          path,
        })
      );

      return false;
    } else if (!Object.keys(target.meta).length > 0) {
      errors.push(
        new MetaError({
          code: META_ERROR_TYPES.OBJECT_MUST_NOT_BE_EMPTY,
          value: target.meta,
          target,
          member: 'meta',
          validator,
          document,
          path,
        })
      );

      return false;
    }

    return hasError;
  }

  return true;
}
