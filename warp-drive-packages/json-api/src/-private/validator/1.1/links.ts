import type { ResourceDocument } from '@warp-drive/core/types/spec/document';
import type {
  CollectionResourceRelationship,
  ResourceObject,
  SingleResourceRelationship,
} from '@warp-drive/core/types/spec/json-api-raw';

import { inspectType, isSimpleObject, type PathLike, type Reporter } from '../utils';

const VALID_COLLECTION_LINKS = ['self', 'related', 'first', 'last', 'prev', 'next'];
const VALID_RESOURCE_RELATIONSHIP_LINKS = ['self', 'related'];
const VALID_RESOURCE_LINKS = ['self'];

/**
 * Validates the links object in a top-level JSON API document or resource object
 *
 * Version: 1.1
 *
 * Section: 7.1 Top Level
 * Link: https://jsonapi.org/format/#document-top-level
 *
 * Section: 7.2.3 Resource Objects
 * Link: https://jsonapi.org/format/#document-resource-object-links
 *
 * Section: 7.2.2.2 Resource Relationships
 * Link: https://jsonapi.org/format/#document-resource-object-relationships
 *
 * Section: 7.6 Document Links
 * Link: https://jsonapi.org/format/#document-links
 *
 * @internal
 */
export function validateLinks(
  reporter: Reporter,
  doc: ResourceDocument | ResourceObject | SingleResourceRelationship | CollectionResourceRelationship,
  type: 'collection-document' | 'resource-document' | 'resource' | 'resource-relationship' | 'collection-relationship',
  path: PathLike = ['links']
): void {
  if (!('links' in doc)) {
    return;
  }

  if (!isSimpleObject(doc.links)) {
    // this is a violation but we report it when validating section 7.1
    return;
  }

  // prettier-ignore
  const VALID_TOP_LEVEL_LINKS =
    type === 'collection-document' || type === 'collection-relationship' ? VALID_COLLECTION_LINKS
    : type === 'resource-document' || type === 'resource-relationship' ? VALID_RESOURCE_RELATIONSHIP_LINKS
    : type === 'resource' ? VALID_RESOURCE_LINKS
    : [];

  const links = doc.links;
  const keys = Object.keys(links);
  for (const key of keys) {
    if (!VALID_TOP_LEVEL_LINKS.includes(key)) {
      reporter.warn(
        [...path, key],
        `Unrecognized top-level link. The data it provides may be ignored as it is not a valid {json:api} link for a ${type}`
      );
    }
    // links may be either a string or an object with an href property or null
    if (links[key] === null) {
      // valid
    } else if (typeof links[key] === 'string') {
      if (links[key].length === 0) {
        reporter.warn([...path, key], `Expected a non-empty string, but received an empty string`);
      }
      // valid, though we should potentially validate the URL here
    } else if (isSimpleObject(links[key])) {
      if ('href' in links[key]) {
        const linksKeys = Object.keys(links[key]);
        if (linksKeys.length > 1) {
          reporter.warn(
            [...path, key],
            `Expected the links object to only have an href property, but received unknown keys ${linksKeys.filter((k) => k !== 'href').join(', ')}`
          );
        }

        if (typeof links[key].href !== 'string') {
          reporter.error(
            [...path, key, 'href'],
            `Expected a string value, but received ${inspectType(links[key].href)}`
          );
        } else {
          if (links[key].href.length === 0) {
            reporter.warn([...path, key, 'href'], `Expected a non-empty string, but received an empty string`);
          }
          // valid, though we should potentially validate the URL here
        }
      } else {
        const linksKeys = Object.keys(links[key]);
        if (linksKeys.length > 0) {
          reporter.error(
            [...path, key],
            `Expected the links object to have an href property, but received only the unknown keys ${linksKeys.join(', ')}`
          );
        } else {
          reporter.error([...path, key], `Expected the links object to have an href property`);
        }
      }
    } else {
      // invalid
      reporter.error(
        [...path, key],
        `Expected a string, null, or an object with an href property for the link "${key}", but received ${inspectType(
          links[key]
        )}`
      );
    }
  }
}
