import {
  CollectionResourceDocument,
  JsonApiDocument,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';

export function isCollectionDocument(document: JsonApiDocument): document is CollectionResourceDocument {
  return Array.isArray(document.data);
}

export function isResourceDocument(document: JsonApiDocument): document is SingleResourceDocument {
  return 'data' in document && document.data !== null && !Array.isArray(document.data);
}
