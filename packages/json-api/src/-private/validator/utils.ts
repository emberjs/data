import type { CacheCapabilitiesManager, SchemaService } from '@ember-data/store/types';
import type {
  StructuredDataDocument,
  StructuredDocument,
  StructuredErrorDocument,
} from '@warp-drive/core-types/request';
import type {
  ResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
} from '@warp-drive/core-types/spec/document';

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

interface ErrorReport {
  path: string[];
  message: string;
}
export class Reporter {
  capabilities: CacheCapabilitiesManager;
  contextDocument: StructuredDocument<ResourceDocument>;
  errors: ErrorReport[] = [];
  warnings: ErrorReport[] = [];
  infos: ErrorReport[] = [];

  strict = {
    linkage: true,
    unknownType: true,
    unknownAttribute: true,
    unknownRelationship: true,
  };

  constructor(capabilities: CacheCapabilitiesManager, doc: StructuredDocument<ResourceDocument>) {
    this.capabilities = capabilities;
    this.contextDocument = doc;
  }

  get schema() {
    return this.capabilities.schema;
  }

  error(path: string[], message: string) {
    this.errors.push({ path, message });
  }

  warn(path: string[], message: string) {
    this.warnings.push({ path, message });
  }

  info(path: string[], message: string) {
    this.infos.push({ path, message });
  }

  hasExtension(extensionName: string) {
    return REGISTERED_EXTENSIONS.has(extensionName);
  }

  getExtension(extensionName: string) {
    return REGISTERED_EXTENSIONS.get(extensionName);
  }
}

type ReporterFn = (reporter: Reporter, path: string[]) => void;
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
  return false;
}
