import type { Value } from '@warp-drive/core/types/json/raw';
import type { JsonApiDocument } from '@warp-drive/core/types/spec/json-api-raw';

/**
 * A media type which indicates that the response format is {JSON:API}
 * delivered in a streaming format.
 */
export const JSON_API_STREAMS_HEADER = 'application/vnd.api+json-stream';
/**
 * The Record Separator Control Character, used to specify the begining
 * of a new resource in the stream.
 */
export const RS = '\x1e';
/**
 * File Separator, used to specify the beginning of a new document
 * (request response) in the stream.
 */
export const FS = '\x1c';
/**
 * Group Separator, used to specify the beginning of a new field or
 * data group in the stream.
 */
export const GS = '\x1d';
/**
 * Unit Separator, used to specify the beginning of individual fields
 */
export const US = '\x1f';

/**
 * It is expected that the stream conform to the following standard:
 *
 * 1. Each document in the stream begins with {FS}.
 *
 * 2. documents may have any of the following groups, but they MUST appear in the
 * order shown here. Groups are deliminated by {GS}
 *
 * - pragma
 * - links
 * - meta
 * - included
 * - data (data-resource|data-collection)
 * - errors
 *
 * 3. Within data and included, each record begins with RS
 *
 */

export interface JsonApiSerializerOptions {
  minify: false | 'lines' | true;
}

/**
 * Takes a {JSON:API} document and converts it
 * into a stream
 */
export function* serializeDocument(
  document: JsonApiDocument,
  options: Partial<JsonApiSerializerOptions> = {}
): Generator<string, void, void> {
  const NewLine = options.minify === true ? '' : '\n';
  const MinifyObjects = options.minify === true || options.minify === 'lines';
  const toString = MinifyObjects ? JSON.stringify : (v: Value) => JSON.stringify(v, null, 2);
  yield FS;
  if ('links' in document) {
    if (NewLine) yield NewLine;
    yield GS;
    yield toString({ name: 'links' });
    if (NewLine) yield NewLine;
    yield toString(document.links);
  }
  if ('meta' in document) {
    if (NewLine) yield NewLine;
    yield GS;
    yield toString({ name: 'meta' });
    if (NewLine) yield NewLine;
    yield toString(document.meta);
  }
  if ('included' in document && document.included!.length > 0) {
    const included = document.included!;
    if (NewLine) yield NewLine;
    yield GS;
    yield toString({ name: 'included' });

    for (const record of included) {
      if (NewLine) yield NewLine;
      yield RS;
      yield toString(record);
    }
  }
  if ('data' in document) {
    if (!Array.isArray(document.data)) {
      if (NewLine) yield NewLine;
      yield GS;
      yield toString({ name: 'data-resource' });
      if (NewLine) yield NewLine;
      yield RS;
      yield toString(document.data);
    } else {
      if (NewLine) yield NewLine;
      yield GS;
      yield toString({ name: 'data-collection' });

      for (const record of document.data) {
        if (NewLine) yield NewLine;
        yield RS;
        yield toString(record);
      }
    }
  }
  if ('errors' in document) {
    if (NewLine) yield NewLine;
    yield GS;
    yield toString({ name: 'errors' });
    if (NewLine) yield NewLine;
    yield toString(document.errors);
  }
}

declare global {
  interface ReadableStream<R> {
    [Symbol.asyncIterator](): AsyncIterator<R>;
  }
}

export async function reifyDocument(stream: ReadableStream<Uint8Array>): Promise<JsonApiDocument[]> {
  const documents: JsonApiDocument[] = [];
  let buffer = '';
  const decoder = new TextDecoder();
  let currentDocument: Partial<JsonApiDocument> | null = null;
  let currentGroup: string | null = null;
  let currentJsonBuffer = '';
  let expectingGroupName = false;
  let collectingResources = false;
  let currentResourcesArray: Value[] = [];

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });

    let processedUpTo = 0;

    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];

      if (char === FS) {
        // Process any remaining JSON buffer from previous document
        if (currentJsonBuffer.trim() && currentDocument && currentGroup) {
          finalizePendingJson();
        }

        // Start new document
        currentDocument = {};
        documents.push(currentDocument as JsonApiDocument);
        currentGroup = null;
        currentJsonBuffer = '';
        expectingGroupName = false;
        collectingResources = false;
        currentResourcesArray = [];
        processedUpTo = i + 1;
      } else if (char === GS && currentDocument) {
        // Process any pending JSON from previous group
        if (currentJsonBuffer.trim() && currentGroup) {
          finalizePendingJson();
        }

        // Start new group
        currentJsonBuffer = '';
        expectingGroupName = true;
        collectingResources = false;
        processedUpTo = i + 1;
      } else if (char === RS && currentDocument && currentGroup) {
        // Process previous resource if we have one
        if (currentJsonBuffer.trim()) {
          if (collectingResources) {
            try {
              const resource = JSON.parse(currentJsonBuffer.trim()) as Value;
              currentResourcesArray.push(resource);
            } catch {
              // Handle malformed JSON gracefully
            }
          } else {
            finalizePendingJson();
          }
        }

        // Start collecting new resource
        currentJsonBuffer = '';
        collectingResources = true;
        processedUpTo = i + 1;
      } else if (char === '\n') {
        // Skip newlines when not collecting JSON
        if (!expectingGroupName && !collectingResources && !currentJsonBuffer.trim()) {
          processedUpTo = i + 1;
        }
      }
    }

    // Extract the JSON content between control characters
    if (processedUpTo < buffer.length) {
      currentJsonBuffer += buffer.slice(processedUpTo);
    }

    // Keep only unprocessed part of buffer to prevent memory bloat
    buffer = buffer.slice(processedUpTo);
  }

  // Process any remaining JSON buffer
  if (currentJsonBuffer.trim() && currentDocument && currentGroup) {
    finalizePendingJson();
  }

  function finalizePendingJson() {
    if (!currentDocument || !currentJsonBuffer.trim()) return;

    try {
      const jsonStr = currentJsonBuffer.trim();

      if (expectingGroupName) {
        // This should be a group name object like { name: "data-collection" }
        const groupInfo = JSON.parse(jsonStr) as { name: string };
        currentGroup = groupInfo.name;
        expectingGroupName = false;

        // Set up for resource collection if needed
        if (currentGroup === 'data-collection' || currentGroup === 'included') {
          collectingResources = true;
          currentResourcesArray = [];
        }
      } else {
        // This is actual data
        const data = JSON.parse(jsonStr) as Value;

        if (collectingResources) {
          // Add final resource to array
          currentResourcesArray.push(data);

          // Assign completed array to document
          if (currentGroup === 'data-collection') {
            (currentDocument as unknown as { data: Value[] }).data = currentResourcesArray;
          } else if (currentGroup === 'included') {
            (currentDocument as unknown as { included: Value[] }).included = currentResourcesArray;
          }
        } else {
          // Direct assignment for non-collection groups
          switch (currentGroup) {
            case 'links':
              (currentDocument as unknown as { links: Value }).links = data;
              break;
            case 'meta':
              (currentDocument as unknown as { meta: Value }).meta = data;
              break;
            case 'data-resource':
              (currentDocument as unknown as { data: Value }).data = data;
              break;
            case 'errors':
              (currentDocument as unknown as { errors: Value }).errors = data;
              break;
          }
        }
      }

      currentJsonBuffer = '';
    } catch {
      // Handle malformed JSON gracefully
      currentJsonBuffer = '';
    }
  }

  return documents;
}
