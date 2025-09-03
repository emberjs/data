import type { FuseResult } from 'fuse.js';
import Fuse from 'fuse.js';
import type { ArrayNode, ObjectNode } from 'json-to-ast';
import jsonToAst from 'json-to-ast';

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
export class Reporter {
  capabilities: CacheCapabilitiesManager;
  contextDocument: StructuredDocument<ResourceDocument>;
  errors: ErrorReport[] = [];
  ast: ReturnType<typeof jsonToAst>;
  jsonStr: string;

  // TODO @runspired make this configurable to consuming apps before
  // activating by default
  strict = {
    linkage: true,
    unknownType: true,
    unknownAttribute: true,
    unknownRelationship: true,
  };

  constructor(capabilities: CacheCapabilitiesManager, doc: StructuredDocument<ResourceDocument>) {
    this.capabilities = capabilities;
    this.contextDocument = doc;

    this.jsonStr = JSON.stringify(doc.content, null, 2);
    this.ast = jsonToAst(this.jsonStr, { loc: true });
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
      const attrs = Array.from(allFields.values())
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
      return this.ast.loc!;
    }

    let priorNode = this.ast as ObjectNode | ArrayNode;
    let node = this.ast as ObjectNode | ArrayNode;
    for (const segment of path) {
      //
      // handle array paths
      //
      if (typeof segment === 'number') {
        assert(`Because the segment is a number, expected a node of type Array`, node.type === 'Array');

        if (node.children && node.children[segment]) {
          priorNode = node;
          const childNode = node.children[segment];

          if (childNode.type === 'Object' || childNode.type === 'Array') {
            node = childNode;
          } else {
            // set to the closest node we can find
            return node.loc!;
          }
        } else {
          // set to the closest node we can find
          // as we had no children
          return priorNode.loc!;
        }

        //
        // handle object paths
        //
      } else {
        assert(`Because the segment is a string, expected a node of type Object`, node.type === 'Object');

        const child = node.children.find((childCandidate) => {
          if (childCandidate.type === 'Property') {
            return childCandidate.key.type === 'Identifier' && childCandidate.key.value === segment;
          }
          return false;
        });

        if (child) {
          if (child.value.type === 'Object' || child.value.type === 'Array') {
            priorNode = node;
            node = child.value;
          } else {
            // set to the closest node we can find
            return kind === 'key' ? child.key.loc! : child.value.loc!;
          }
        } else {
          // set to the closest node we can find
          return priorNode.loc!;
        }
      }
    }

    return node.loc!;
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
    const lines = this.jsonStr.split('\n');

    // sort the errors by line, then by column, then by type
    const { errors } = this;

    if (!errors.length) {
      return;
    }

    errors.sort((a, b) => {
      return a.loc.end.line < b.loc.end.line
        ? -1
        : a.loc.end.column < b.loc.end.column
          ? -1
          : compareType(a.type, b.type);
    });

    // store the errors in a map by line
    const errorMap = new Map<number, ErrorReport[]>();
    for (const error of errors) {
      const line = error.loc.end.line;
      if (!errorMap.has(line)) {
        errorMap.set(line, []);
      }
      errorMap.get(line)!.push(error);
    }

    // splice the errors into the lines
    const errorLines: string[] = [];
    const colors: string[] = [];
    const counts = {
      error: 0,
      warning: 0,
      info: 0,
    };

    const LINE_SIZE = String(lines.length).length;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      errorLines.push(
        colorize
          ? `${String(i + 1).padEnd(LINE_SIZE, ' ')}  \t%c${line}%c`
          : `${String(i + 1).padEnd(LINE_SIZE, ' ')}  \t${line}`
      );
      colors.push(
        `color: grey; background-color: transparent;`, // first color sets color
        `color: inherit; background-color: transparent;` // second color resets the color profile
      );
      if (errorMap.has(i + 1)) {
        const errorsForLine = errorMap.get(i + 1)!;
        for (const error of errorsForLine) {
          counts[error.type]++;
          const { loc, message } = error;
          const start = loc.end.line === loc.start.line ? loc.start.column - 1 : loc.end.column - 1;
          const end = loc.end.column - 1;
          const symbol = error.type === 'error' ? '❌' : error.type === 'warning' ? '⚠️' : 'ℹ️';
          const errorLine = colorize
            ? `${''.padStart(LINE_SIZE, ' ') + symbol}\t${' '.repeat(start)}%c^${'~'.repeat(end - start)} %c//%c ${message}%c`
            : `${''.padStart(LINE_SIZE, ' ') + symbol}\t${' '.repeat(start)}^${'~'.repeat(end - start)} // ${message}`;
          errorLines.push(errorLine);
          colors.push(
            error.type === 'error' ? 'color: red;' : error.type === 'warning' ? 'color: orange;' : 'color: blue;',
            'color: grey;',
            error.type === 'error' ? 'color: red;' : error.type === 'warning' ? 'color: orange;' : 'color: blue;',
            'color: inherit; background-color: transparent;' // reset color
          );
        }
      }
    }

    const contextStr = `${counts.error} errors and ${counts.warning} warnings found in the {json:api} document returned by ${this.contextDocument.request?.method} ${this.contextDocument.request?.url}`;
    const errorString = contextStr + `\n\n` + errorLines.join('\n');

    // eslint-disable-next-line no-console, @typescript-eslint/no-unused-expressions
    colorize ? console.log(errorString, ...colors) : console.log(errorString);

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
