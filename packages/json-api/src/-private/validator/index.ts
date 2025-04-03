import type { StructuredDataDocument, StructuredDocument, StructuredErrorDocument } from '@ember-data/request';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import { assert } from '@warp-drive/build-config/macros';
import type { ResourceDocument, ResourceMetaDocument } from '@warp-drive/core-types/spec/document';

import { validateTopLevelDocumentMembers } from './1.1/7.1_top-level-document-members';
import { validateDocumentResources } from './1.1/7.2_resource-objects';
import { validateLinks } from './1.1/links';
import { isErrorDocument, isMetaDocument, isPushedDocument, Reporter } from './utils';

export function validateDocument(capabilities: CacheCapabilitiesManager, doc: StructuredDocument<ResourceDocument>) {
  assert(
    `Expected a JSON:API Document as the content provided to the cache, received ${typeof doc.content}`,
    doc instanceof Error || (typeof doc.content === 'object' && doc.content !== null)
  );
  const reporter = new Reporter(capabilities, doc);

  if (isErrorDocument(doc)) {
    return validateErrorDocument(reporter, doc);
  } else if (isMetaDocument(doc)) {
    return validateMetaDocument(reporter, doc);
  } else if (isPushedDocument(doc)) {
    return validatePushedDocument(reporter, doc);
  }

  return validateResourceDocument(reporter, doc as StructuredDataDocument<ResourceDocument>);
}

function validateErrorDocument(reporter: Reporter, doc: StructuredErrorDocument) {}

function validateMetaDocument(reporter: Reporter, doc: StructuredDataDocument<ResourceMetaDocument>) {}

function validatePushedDocument(reporter: Reporter, doc: StructuredDataDocument<ResourceDocument>) {}

function validateResourceDocument(reporter: Reporter, doc: StructuredDataDocument<ResourceDocument>) {
  validateTopLevelDocumentMembers(reporter, doc.content);
  validateLinks(
    reporter,
    doc.content,
    'data' in doc.content && Array.isArray(doc.content?.data) ? 'collection-document' : 'resource-document'
  );
  validateDocumentResources(reporter, doc.content);

  // FIXME
  // validateMeta on document
  // validateMeta on resource
  // validateMeta on resource relationships
  // validateMeta on links
  // validate links objects more deeply
  // validate no-meta on resource identifiers
  //
  // fuzzy-search missing/unexpected resource-types
  //
  // ---------------------------------
  // super-strict-mode
  //
  // validate full-linkage requirement
  //
  // ---------------------------------
  // nice-to-have
  //
  // validate includes
  // validate sparse fieldsets
  // validate sort ?
  // validate pagination profile ?

  // PRINT ERRORS AND WARNINGS gated by a LOGGING flag (for now)
}
