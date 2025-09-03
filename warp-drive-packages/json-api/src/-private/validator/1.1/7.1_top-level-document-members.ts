import type { ResourceDocument } from '@warp-drive/core/types/spec/document';

import { inspectType, isSimpleObject, type Reporter } from '../utils';

const VALID_TOP_LEVEL_MEMBERS = ['data', 'included', 'meta', 'jsonapi', 'links'];

/**
 * Reports issues which violate the JSON:API spec for top-level members.
 *
 * Version: 1.1
 * Section: 7.1
 * Link: https://jsonapi.org/format/#document-top-level
 *
 * @internal
 */
export function validateTopLevelDocumentMembers(reporter: Reporter, doc: ResourceDocument): void {
  const keys = Object.keys(doc);

  for (const key of keys) {
    if (!VALID_TOP_LEVEL_MEMBERS.includes(key)) {
      if (key.includes(':')) {
        // TODO @runspired expose the API to enable folks to add validation for their own extensions
        const extensionName = key.split(':')[0];

        if (reporter.hasExtension(extensionName)) {
          const extension = reporter.getExtension(extensionName)!;
          extension(reporter, [key]);
        } else {
          reporter.warn(
            [key],
            `Unrecognized extension ${extensionName}. The data provided by "${key}" will be ignored as it is not a valid {json:api} member`
          );
        }
      } else {
        reporter.error(
          [key],
          `Unrecognized top-level member. The data it provides is ignored as it is not a valid {json:api} member`
        );
      }
    }
  }

  // additional rules for top-level members
  // ======================================

  // 1. MUST have either `data`, `errors`, or `meta`
  if (!('data' in doc) && !('errors' in doc) && !('meta' in doc)) {
    reporter.error([], 'A {json:api} Document must contain one-of `data` `errors` or `meta`');
  }

  // 2. MUST NOT have both `data` and `errors`
  if ('data' in doc && 'errors' in doc) {
    reporter.error(['data'], 'A {json:api} Document MUST NOT contain both `data` and `errors` members');
  }

  // 3. MUST NOT have both `included` and `errors`
  // while not explicitly stated in the spec, this is a logical extension of the above rule
  // since `included` is only valid when `data` is present.
  if ('included' in doc && 'errors' in doc) {
    reporter.error(['included'], 'A {json:api} Document MUST NOT contain both `included` and `errors` members');
  }

  // 4. MUST NOT have `included` if `data` is not present
  if ('included' in doc && !('data' in doc)) {
    reporter.error(['included'], 'A {json:api} Document MUST NOT contain `included` if `data` is not present');
  }

  // 5. MUST NOT have `included` if `data` is null
  // when strictly enforcing full linkage, we need to ensure that `included` is not present if `data` is null
  // however, most APIs will ignore this rule for DELETE requests, so unless strict linkage is enabled, we will only warn
  // about this issue.
  if ('included' in doc && doc.data === null) {
    const isMaybeDelete =
      reporter.contextDocument.request?.method?.toUpperCase() === 'DELETE' ||
      reporter.contextDocument.request?.op === 'deleteRecord';
    const method = !reporter.strict.linkage && isMaybeDelete ? 'warn' : 'error';
    reporter[method](['included'], 'A {json:api} Document MUST NOT contain `included` if `data` is null');
  }

  // Simple Validation of Top-Level Members
  // ==========================================
  // 1. `data` MUST be a single resource object or an array of resource objects or `null`
  if ('data' in doc) {
    const dataMemberHasAppropriateForm = doc.data === null || Array.isArray(doc.data) || isSimpleObject(doc.data);
    if (!dataMemberHasAppropriateForm) {
      reporter.error(
        ['data'],
        `The 'data' member MUST be a single resource object or an array of resource objects or null. Received data of type "${inspectType(doc.data)}"`
      );
    }
  }

  // 2. `included` MUST be an array of resource objects
  if ('included' in doc) {
    if (!Array.isArray(doc.included)) {
      reporter.error(
        ['included'],
        `The 'included' member MUST be an array of resource objects. Received data of type "${inspectType(doc.included)}"`
      );
    }
  }

  // 3. `meta` MUST be a simple object
  if ('meta' in doc) {
    if (!isSimpleObject(doc.meta)) {
      reporter.error(
        ['meta'],
        `The 'meta' member MUST be a simple object. Received data of type "${inspectType(doc.meta)}"`
      );
    }
  }

  // 4. `jsonapi` MUST be a simple object
  if ('jsonapi' in doc) {
    if (!isSimpleObject(doc.jsonapi)) {
      reporter.error(
        ['jsonapi'],
        `The 'jsonapi' member MUST be a simple object. Received data of type "${inspectType(doc.jsonapi)}"`
      );
    }
  }

  // 5. `links` MUST be a simple object
  if ('links' in doc) {
    if (!isSimpleObject(doc.links)) {
      reporter.error(
        ['links'],
        `The 'links' member MUST be a simple object. Received data of type "${inspectType(doc.links)}"`
      );
    }
  }

  // 6. `errors` MUST be an array of error objects
  if ('errors' in doc) {
    if (!Array.isArray(doc.errors)) {
      reporter.error(
        ['errors'],
        `The 'errors' member MUST be an array of error objects. Received data of type "${inspectType(doc.errors)}"`
      );
    }
  }
}
