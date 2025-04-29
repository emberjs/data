import type { StructuredDataDocument, StructuredDocument } from '@ember-data/request';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { JSON_API_CACHE_VALIDATION_ERRORS } from '@warp-drive/build-config/canary-features';
import { LOG_CACHE } from '@warp-drive/build-config/debugging';
import { assert } from '@warp-drive/build-config/macros';
import type { ResourceDocument } from '@warp-drive/core-types/spec/document';

import { validateTopLevelDocumentMembers } from './1.1/7.1_top-level-document-members';
import { validateDocumentResources } from './1.1/7.2_resource-objects';
import { validateLinks } from './1.1/links';
import { isErrorDocument, isMetaDocument, isPushedDocument, Reporter } from './utils';

export function validateDocument(capabilities: CacheCapabilitiesManager, doc: StructuredDocument<ResourceDocument>) {
  assert(
    `Expected a JSON:API Document as the content provided to the cache, received ${typeof doc.content}`,
    doc instanceof Error || (typeof doc.content === 'object' && doc.content !== null)
  );

  // if the feature is not active and the payloads are not being logged
  // we don't need to validate the payloads
  if (!JSON_API_CACHE_VALIDATION_ERRORS) {
    if (!LOG_CACHE) {
      return;
    }
  }

  if (!LOG_CACHE) {
    if (!JSON_API_CACHE_VALIDATION_ERRORS) {
      return;
    }
  }

  if (isErrorDocument(doc)) {
    return; // return validateErrorDocument(reporter, doc);
  } else if (isMetaDocument(doc)) {
    return; // return validateMetaDocument(reporter, doc);
  } else if (isPushedDocument(doc)) {
    return; // return validatePushedDocument(reporter, doc);
  }

  const reporter = new Reporter(capabilities, doc);
  return validateResourceDocument(reporter, doc as StructuredDataDocument<ResourceDocument>);
}

// function validateErrorDocument(reporter: Reporter, doc: StructuredErrorDocument) {}

// function validateMetaDocument(reporter: Reporter, doc: StructuredDataDocument<ResourceMetaDocument>) {}

// function validatePushedDocument(reporter: Reporter, doc: StructuredDataDocument<ResourceDocument>) {}

function validateResourceDocument(reporter: Reporter, doc: StructuredDataDocument<ResourceDocument>) {
  validateTopLevelDocumentMembers(reporter, doc.content);
  validateLinks(
    reporter,
    doc.content,
    'data' in doc.content && Array.isArray(doc.content?.data) ? 'collection-document' : 'resource-document'
  );
  validateDocumentResources(reporter, doc.content);

  // TODO @runspired - validateMeta on document
  // TODO @runspired - validateMeta on resource
  // TODO @runspired - validateMeta on resource relationships
  // TODO @runspired - validate no-meta on resource identifiers
  //
  // ---------------------------------
  // super-strict-mode
  //
  // TODO @runspired - validate that all referenced resource identifiers are present in the document (full linkage)
  // TODO @runspired - validate that all included resources have a path back to `data` (full linkage)
  //
  // ---------------------------------
  // nice-to-haves
  //
  // TODO @runspired - validate links objects more thoroughly for spec props we don't use
  // TODO @runspired - validate request includes are in fact included
  // TODO @runspired - validate request fields are in fact present
  // TODO @runspired - MAYBE validate request sort is in fact sorted? (useful for catching Mocking bugs)
  // TODO @runspired - MAYBE validate request pagination is in fact paginated? (useful for catching Mocking bugs)

  reporter.report();
}
