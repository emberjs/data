import type { ArrayNode, ObjectNode, ValueNode } from '@humanwhocodes/momoa';
import { parse } from '@humanwhocodes/momoa';
import type { FuseResult } from 'fuse.js';
import Fuse from 'fuse.js';

import { JSON_API_CACHE_VALIDATION_ERRORS } from '@warp-drive/core/build-config/canary-features';
import { assert } from '@warp-drive/core/build-config/macros';
import type { CacheCapabilitiesManager, SchemaService } from '@warp-drive/core/types';
import type {
  StructuredDataDocument,
  StructuredDocument,
  StructuredErrorDocument,
} from '@warp-drive/core/types/request';
import type { FieldSchema } from '@warp-drive/core/types/schema/fields';
import type {
  ResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
} from '@warp-drive/core/types/spec/document';
import type { ResourceObject } from '@warp-drive/core/types/spec/json-api-raw';

export function inspectType(obj: unknown): string {
  if (obj === null) {
    return 'null';
  }
  if (Array.isArray(obj)) {
    return 'array';
  }
  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj) as unknown;
    if (proto === null) {
      return 'object';
    }
    if (proto === Object.prototype) {
      return 'object';
    }
    return `object (${(proto as object).constructor?.name})`;
  }
  if (typeof obj === 'function') {
    return 'function';
  }
  if (typeof obj === 'string') {
    return 'string';
  }
  if (typeof obj === 'number') {
    return 'number';
  }
  if (typeof obj === 'boolean') {
    return 'boolean';
  }
  if (typeof obj === 'symbol') {
    return 'symbol';
  }
  if (typeof obj === 'bigint') {
    return 'bigint';
  }
  if (typeof obj === 'undefined') {
    return 'undefined';
  }
  return 'unknown';
}

export function isSimpleObject(obj: unknown): obj is Record<string, unknown> {
  if (obj === null) {
    return false;
  }
  if (Array.isArray(obj)) {
    return false;
  }
  if (typeof obj !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(obj) as unknown;
  if (proto === null) {
    return true;
  }
  if (proto === Object.prototype) {
    return true;
  }
  return false;
}

export const RELATIONSHIP_FIELD_KINDS: string[] = ['belongsTo', 'hasMany', 'resource', 'collection'];
export type PathLike = Array<string | number>;
interface ErrorReport {
  path: PathLike;
  message: string;
  loc: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  type: 'error' | 'warning' | 'info';
  kind: 'key' | 'value';
}

export interface ResourcePresence {
  data: Map<string, Map<string, ResourceInfo[]>>;
  included: Map<string, Map<string, ResourceInfo[]>>;
  all: Map<string, Map<string, ResourceInfo[]>>;
}

export interface ResourceInfo {
  data: ResourceObject;
  /**
   * null if the only primary data member
   */
  index: number | null;
  location: 'data' | 'included';
}

export class Reporter {
  capabilities: CacheCapabilitiesManager;
  contextDocument: StructuredDocument<ResourceDocument>;
  errors: ErrorReport[] = [];

  /**
   * The maximum number of source lines the reporter will annotate and emit
   * in a single `console.log` call when producing a report. Documents with
   * more lines than this are chunked across multiple calls so that no
   * single call ever has to spread an unbounded number of colorization
   * args (which can exceed engine call-argument/stack limits for very
   * large payloads).
   */
  maxLines = 500;

  /**
   * The number of source lines to show before/after each reported line when
   * annotating the document. Stretches of source between annotated lines
   * that are larger than this get collapsed into a single
   * `... N lines skipped ...` marker rather than printed in full.
   */
  contextLines = 2;

  /**
   * The number of occurrences of an identical error message to annotate
   * inline before collapsing the rest. When a message recurs beyond this
   * count, the last shown occurrence's annotation is suffixed with
   * `(recurs N more times)` and the remaining occurrences are omitted from
   * the printed document entirely (though they still count toward the
   * totals in the summary line).
   */
  maxOccurrencesPerGroup = 1;

  /**
   * The number of distinct error messages to annotate inline before
   * refusing to show any more. Once this many distinct messages have been
   * shown, further distinct messages are omitted entirely and rolled up
   * into a single trailing `... and N more distinct issues ... not shown`
   * line so nothing is dropped silently.
   */
  maxDistinctIssues = 50;

  declare _ast: ValueNode | undefined;
  declare _jsonStr: string | undefined;

  // lazy: only parse the document into a string/AST if we actually need to
  // locate an error, warning, or info within it. Clean documents (the vast
  // majority) never pay this cost.
  get jsonStr(): string {
    if (this._jsonStr === undefined) {
      this._jsonStr = JSON.stringify(this.contextDocument.content, null, 2);
    }
    return this._jsonStr;
  }

  get ast(): ValueNode {
    if (!this._ast) {
      this._ast = parse(this.jsonStr).body;
    }
    return this._ast;
  }

  // TODO @runspired make this configurable to consuming apps before
  // activating by default
  strict = {
    linkage: true,
    unknownType: true,
    unknownAttribute: true,
    unknownRelationship: true,
    enforceReachable: true,
  };

  _presence: ResourcePresence | null = null;

  get presence(): ResourcePresence {
    if (this._presence) {
      return this._presence;
    }

    const primaryResources = new Map<string, Map<string, ResourceInfo[]>>();
    const includedResources = new Map<string, Map<string, ResourceInfo[]>>();
    const allResources = new Map<string, Map<string, ResourceInfo[]>>();

    const doc = this.contextDocument.content;
    if (doc) {
      if ('data' in doc && doc.data) {
        if (Array.isArray(doc.data)) {
          for (let i = 0; i < doc.data.length; i++) {
            addResourceToMap(primaryResources, doc.data[i], i, 'data');
            addResourceToMap(allResources, doc.data[i], i, 'data');
          }
        } else {
          addResourceToMap(primaryResources, doc.data, null, 'data');
          addResourceToMap(allResources, doc.data, null, 'data');
        }
      }
    }

    if (doc && 'included' in doc && Array.isArray(doc.included)) {
      for (let i = 0; i < doc.included.length; i++) {
        addResourceToMap(includedResources, doc.included[i], i, 'included');
        addResourceToMap(allResources, doc.included[i], i, 'included');
      }
    }

    this._presence = {
      data: primaryResources,
      included: includedResources,
      all: allResources,
    };
    return this._presence;
  }

  constructor(capabilities: CacheCapabilitiesManager, doc: StructuredDocument<ResourceDocument>) {
    this.capabilities = capabilities;
    this.contextDocument = doc;
  }

  declare _typeFilter: Fuse<string> | undefined;
  searchTypes(type: string): FuseResult<string>[] {
    if (!this._typeFilter) {
      const allTypes = this.schema.resourceTypes();
      this._typeFilter = new Fuse(allTypes);
    }
    const result = this._typeFilter.search(type);
    return result;
  }

  _fieldFilters: Map<string, Fuse<string>> = new Map();
  searchFields(type: string, field: string): FuseResult<string>[] {
    if (!this._fieldFilters.has(type)) {
      const allFields = this.schema.fields({ type });
      const allCacheFields = this.schema.cacheFields?.({ type }) ?? allFields;
      const attrs = Array.from(allCacheFields.values())
        .filter(isRemoteField)
        .map((v) => v.name);
      this._fieldFilters.set(type, new Fuse(attrs));
    }
    const result = this._fieldFilters.get(type)!.search(field);
    return result;
  }

  get schema(): SchemaService {
    return this.capabilities.schema;
  }

  getLocation(
    path: PathLike,
    kind: 'key' | 'value'
  ): {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  } {
    if (path.length === 0) {
      return this.ast.loc;
    }

    let priorNode = this.ast as ObjectNode | ArrayNode;
    let node = this.ast as ObjectNode | ArrayNode;
    for (const segment of path) {
      //
      // handle array paths
      //
      if (typeof segment === 'number') {
        assert(`Because the segment is a number, expected a node of type Array`, node.type === 'Array');

        if (node.elements[segment]) {
          priorNode = node;
          const childNode = node.elements[segment].value;

          if (childNode.type === 'Object' || childNode.type === 'Array') {
            node = childNode;
          } else {
            // set to the closest node we can find
            return node.loc;
          }
        } else {
          // set to the closest node we can find
          // as we had no children
          return priorNode.loc;
        }

        //
        // handle object paths
        //
      } else {
        assert(`Because the segment is a string, expected a node of type Object`, node.type === 'Object');

        const child = node.members.find((member) => member.name.type === 'String' && member.name.value === segment);

        if (child) {
          if (child.value.type === 'Object' || child.value.type === 'Array') {
            priorNode = node;
            node = child.value;
          } else {
            // set to the closest node we can find
            return kind === 'key' ? child.name.loc : child.value.loc;
          }
        } else {
          // set to the closest node we can find
          return priorNode.loc;
        }
      }
    }

    return node.loc;
  }

  error(path: PathLike, message: string, kind: 'key' | 'value' = 'key'): void {
    const loc = this.getLocation(path, kind);
    this.errors.push({ path, message, loc, type: 'error', kind });
  }

  warn(path: PathLike, message: string, kind: 'key' | 'value' = 'key'): void {
    const loc = this.getLocation(path, kind);
    this.errors.push({ path, message, loc, type: 'warning', kind });
  }

  info(path: PathLike, message: string, kind: 'key' | 'value' = 'key'): void {
    const loc = this.getLocation(path, kind);
    this.errors.push({ path, message, loc, type: 'info', kind });
  }

  hasExtension(extensionName: string): boolean {
    return REGISTERED_EXTENSIONS.has(extensionName);
  }

  getExtension(extensionName: string): ReporterFn | undefined {
    return REGISTERED_EXTENSIONS.get(extensionName);
  }

  report(colorize = true): void {
    // sort the errors by line, then by column, then by type
    const { errors } = this;

    if (!errors.length) {
      return;
    }

    const lines = this.jsonStr.split('\n');

    errors.sort((a, b) => {
      return a.loc.end.line < b.loc.end.line
        ? -1
        : a.loc.end.column < b.loc.end.column
          ? -1
          : compareType(a.type, b.type);
    });

    // counts reflect every error/warning/info regardless of whether it ends
    // up annotated inline below, so the header total is always accurate.
    const counts = {
      error: 0,
      warning: 0,
      info: 0,
    };
    for (const error of errors) {
      counts[error.type]++;
    }
    const contextStr = `${counts.error} errors and ${counts.warning} warnings found in the {json:api} document returned by ${this.contextDocument.request?.method ?? 'GET'} ${this.contextDocument.request?.url}`;

    // group identical messages together so repeats can be collapsed down to
    // a representative sample instead of printed in full.
    const groups = new Map<string, ErrorReport[]>();
    for (const error of errors) {
      let group = groups.get(error.message);
      if (!group) {
        group = [];
        groups.set(error.message, group);
      }
      group.push(error);
    }

    const activeErrors = new Set<ErrorReport>();
    const recurrenceNoteFor = new Map<ErrorReport, number>();
    let shownGroupCount = 0;
    let hiddenGroupCount = 0;
    let hiddenOccurrenceCount = 0;

    for (const group of groups.values()) {
      if (shownGroupCount < this.maxDistinctIssues) {
        shownGroupCount++;
        const showCount = Math.min(this.maxOccurrencesPerGroup, group.length);
        for (let i = 0; i < showCount; i++) {
          activeErrors.add(group[i]);
        }
        const extra = group.length - showCount;
        if (extra > 0) {
          recurrenceNoteFor.set(group[showCount - 1], extra);
        }
      } else {
        hiddenGroupCount++;
        hiddenOccurrenceCount += group.length;
      }
    }

    // store the active (to-be-annotated) errors in a map by line
    const errorMap = new Map<number, ErrorReport[]>();
    for (const error of activeErrors) {
      const line = error.loc.end.line;
      let errorsForLine = errorMap.get(line);
      if (!errorsForLine) {
        errorsForLine = [];
        errorMap.set(line, errorsForLine);
      }
      errorsForLine.push(error);
    }

    // determine which stretches of source to display: a window of
    // `contextLines` around every active error line, merging windows that
    // are close enough together that a skip marker wouldn't save anything.
    const MERGE_GAP = 3;
    const activeLines = Array.from(errorMap.keys()).sort((a, b) => a - b);
    const ranges: [number, number][] = [];
    for (const line of activeLines) {
      const start = Math.max(1, line - this.contextLines);
      const end = Math.min(lines.length, line + this.contextLines);
      const lastRange = ranges[ranges.length - 1];
      if (lastRange && start <= lastRange[1] + MERGE_GAP + 1) {
        lastRange[1] = Math.max(lastRange[1], end);
      } else {
        ranges.push([start, end]);
      }
    }

    // extend the first/last range to the document boundary when the
    // leading/trailing stretch is too small for a skip marker to be worth it
    const firstRange = ranges[0];
    if (firstRange && firstRange[0] - 1 <= MERGE_GAP + 1) {
      firstRange[0] = 1;
    }
    const lastRangeOverall = ranges[ranges.length - 1];
    if (lastRangeOverall && lines.length - lastRangeOverall[1] <= MERGE_GAP + 1) {
      lastRangeOverall[1] = lines.length;
    }

    // render into chunks so that no single `console.log` call has to spread
    // more than `this.maxLines` worth of rendered lines as colorization
    // args.
    const chunks: { text: string[]; colors: string[] }[] = [{ text: [], colors: [] }];
    let renderedCount = 0;
    const nextLine = (text: string, lineColors: string[]) => {
      if (renderedCount > 0 && renderedCount % this.maxLines === 0) {
        chunks.push({ text: [], colors: [] });
      }
      const chunk = chunks[chunks.length - 1];
      chunk.text.push(text);
      chunk.colors.push(...lineColors);
      renderedCount++;
    };

    const pushSkipMarker = (gap: number) => {
      nextLine(
        colorize
          ? `%c... ${gap} line${gap === 1 ? '' : 's'} skipped (no errors) ...%c`
          : `... ${gap} line${gap === 1 ? '' : 's'} skipped (no errors) ...`,
        ['color: grey; font-style: italic;', 'color: inherit; background-color: transparent;']
      );
    };

    const LINE_SIZE = String(lines.length).length;
    for (let r = 0; r < ranges.length; r++) {
      const [rangeStart, rangeEnd] = ranges[r];

      if (r === 0) {
        if (rangeStart > 1) {
          pushSkipMarker(rangeStart - 1);
        }
      } else {
        const gap = rangeStart - ranges[r - 1][1] - 1;
        if (gap > 0) {
          pushSkipMarker(gap);
        }
      }

      for (let i = rangeStart; i <= rangeEnd; i++) {
        const line = lines[i - 1];
        nextLine(
          colorize
            ? `${String(i).padEnd(LINE_SIZE, ' ')}  \t%c${line}%c`
            : `${String(i).padEnd(LINE_SIZE, ' ')}  \t${line}`,
          [`color: grey; background-color: transparent;`, `color: inherit; background-color: transparent;`]
        );

        if (errorMap.has(i)) {
          for (const error of errorMap.get(i)!) {
            const { loc } = error;
            const start = loc.end.line === loc.start.line ? loc.start.column - 1 : loc.end.column - 1;
            const end = loc.end.column - 1;
            const symbol = error.type === 'error' ? '❌' : error.type === 'warning' ? '⚠️' : 'ℹ️';
            const extra = recurrenceNoteFor.get(error);
            const message = extra
              ? `${error.message} (recurs ${extra} more time${extra === 1 ? '' : 's'})`
              : error.message;
            nextLine(
              colorize
                ? `${''.padStart(LINE_SIZE, ' ') + symbol}\t${' '.repeat(start)}%c^${'~'.repeat(end - start)} %c//%c ${message}%c`
                : `${''.padStart(LINE_SIZE, ' ') + symbol}\t${' '.repeat(start)}^${'~'.repeat(end - start)} // ${message}`,
              [
                error.type === 'error' ? 'color: red;' : error.type === 'warning' ? 'color: orange;' : 'color: blue;',
                'color: grey;',
                error.type === 'error' ? 'color: red;' : error.type === 'warning' ? 'color: orange;' : 'color: blue;',
                'color: inherit; background-color: transparent;',
              ]
            );
          }
        }
      }
    }

    const lastRenderedRange = ranges[ranges.length - 1];
    if (lastRenderedRange && lastRenderedRange[1] < lines.length) {
      pushSkipMarker(lines.length - lastRenderedRange[1]);
    }

    if (hiddenGroupCount > 0) {
      nextLine(
        colorize
          ? `%c... and ${hiddenGroupCount} more distinct issue${hiddenGroupCount === 1 ? '' : 's'} (${hiddenOccurrenceCount} occurrence${hiddenOccurrenceCount === 1 ? '' : 's'}) not shown ...%c`
          : `... and ${hiddenGroupCount} more distinct issues (${hiddenOccurrenceCount} occurrences) not shown ...`,
        ['color: grey; font-style: italic;', 'color: inherit; background-color: transparent;']
      );
    }

    chunks.forEach((chunk, index) => {
      const prefix = index === 0 ? `${contextStr}\n\n` : '';
      const chunkString = prefix + chunk.text.join('\n');
      // oxlint-disable-next-line no-console, no-unused-expressions
      colorize ? console.log(chunkString, ...chunk.colors) : console.log(chunkString);
    });

    if (JSON_API_CACHE_VALIDATION_ERRORS) {
      if (counts.error > 0) {
        throw new Error(contextStr);
      }
    }
  }
}

// we always want to sort errors first, then warnings, then info
function compareType(a: 'error' | 'warning' | 'info', b: 'error' | 'warning' | 'info') {
  if (a === b) {
    return 0;
  }
  if (a === 'error') {
    return -1;
  }
  if (b === 'error') {
    return 1;
  }
  if (a === 'warning') {
    return -1;
  }
  if (b === 'warning') {
    return 1;
  }
  return 0;
}

type ReporterFn = (reporter: Reporter, path: PathLike) => void;
const REGISTERED_EXTENSIONS = new Map<string, ReporterFn>();

export function isMetaDocument(
  doc: StructuredDocument<ResourceDocument>
): doc is StructuredDataDocument<ResourceMetaDocument> {
  return (
    !(doc instanceof Error) &&
    doc.content &&
    !('data' in doc.content) &&
    !('included' in doc.content) &&
    'meta' in doc.content
  );
}

export function isErrorDocument(
  doc: StructuredDocument<ResourceDocument>
): doc is StructuredErrorDocument<ResourceErrorDocument> {
  return doc instanceof Error;
}

export function isPushedDocument(doc: unknown): doc is { content: ResourceDataDocument } {
  return !!doc && typeof doc === 'object' && 'content' in doc && !('request' in doc) && !('response' in doc);
}

export function logPotentialMatches(matches: FuseResult<string>[], kind: string): string {
  if (matches.length === 0) {
    return '';
  }

  if (matches.length === 1) {
    return `  Did you mean this available ${kind} "${matches[0].item}"?`;
  }

  const potentialMatches = matches.map((match) => match.item).join('", "');
  return `  Did you mean one of these available ${kind}s: "${potentialMatches}"?`;
}

function isRemoteField(v: FieldSchema): boolean {
  return !(v.kind === '@local' || v.kind === 'alias' || v.kind === 'derived');
}

export function getRemoteField(fields: Map<string, FieldSchema>, key: string): FieldSchema | undefined {
  const field = fields.get(key);
  if (!field) {
    return undefined;
  }
  if (!isRemoteField(field)) {
    return undefined;
  }
  return field;
}

/**
 * Detects the common mistake of providing a field's `name` in a payload
 * when the field's schema defines a `sourceKey` that should be used instead.
 *
 * @internal
 */
export function getSourceKeyMismatch(
  fields: Map<string, FieldSchema>,
  key: string
): { field: FieldSchema; sourceKey: string } | undefined {
  const field = getRemoteField(fields, key);
  if (!field) {
    return undefined;
  }
  const sourceKey = 'sourceKey' in field ? field.sourceKey : undefined;
  if (sourceKey && sourceKey !== key) {
    return { field, sourceKey };
  }
  return undefined;
}

function addResourceToMap(
  map: Map<string, Map<string, ResourceInfo[]>>,
  resource: ResourceObject,
  index: number | null,
  location: 'data' | 'included'
): void {
  if (!map.has(resource.type)) {
    map.set(resource.type, new Map());
  }
  if (!map.get(resource.type)!.has(resource.id!)) {
    map.get(resource.type)!.set(resource.id!, []);
  }
  map.get(resource.type)!.get(resource.id!)!.push({ data: resource, index, location });
}

export function checkResourceInMap(
  map: Map<string, Map<string, ResourceInfo[]>>,
  resource: { type: string; id: string }
): boolean {
  return map.has(resource.type) && map.get(resource.type)!.has(resource.id);
}

export function checkResourcePresent(presence: ResourcePresence, resource: { type: string; id: string }): boolean {
  return checkResourceInMap(presence.data, resource) || checkResourceInMap(presence.included, resource);
}
