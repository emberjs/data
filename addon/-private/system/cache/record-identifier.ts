import Store from '../store';
import { Value as JSONValue } from 'json-typescript';
import coerceId from '../coerce-id';
import { DEBUG } from '@glimmer/env';

type TmodelName = string;
type TclientId = string;
type Tid = string;
export type TMeta = { [k: string]: JSONValue };
type TDict<K extends string, V> = { [KK in K]: V };
interface IKeyOptions {
  lid: TDict<TclientId, RecordIdentifier>;
  id: TDict<Tid, RecordIdentifier>;
}

const UPDATE_SYMBOL = `@UPDATE_${Date.now()}`;
let CLIENT_ID = 0;

const STORE_MAP = new WeakMap<Store, TDict<TmodelName, IKeyOptions>>();

function generateLid(): string {
  return `@ember-data:lid-${CLIENT_ID++}`;
}

export interface IResourceIdentifier {
  id: Tid | null;
  lid?: TclientId;
  type: TmodelName;
  meta?: TMeta;
}

export class RecordIdentifier {
  public lid: string;
  public id: string | null;
  public type: string;
  public meta: TMeta | null;

  constructor(args: { lid?: string; id: string | null; type: string; meta?: TMeta | null }) {
    // TODO we may not want to fall back to ID if we want a global lookup of lid
    //   but if we maintain buckets scoped by type this is ok.
    //   polymorphism may be easier with non-scoped buckets and uniform lid
    this.lid = coerceId(args.lid || args.id || generateLid());
    this.id = coerceId(args.id) || null;
    this.type = args.type;
    this.meta = args.meta || null;
  }

  isNew(): boolean {
    return false;
  }

  [UPDATE_SYMBOL]({ meta, type, id }: { meta?: TMeta | null; type?: string; id?: string }) {
    if (type !== undefined) {
      this.type = type;
    }
    if (id !== undefined) {
      this.id = coerceId(id);
    }
    if (meta) {
      Object.assign(this.meta, meta);
    } else if (meta === null) {
      this.meta = null;
    }
  }
}

export function updateRecordIdentifier(store, identifier, resourceIdentifier) {
  let id = identifier.id;
  identifier[UPDATE_SYMBOL](resourceIdentifier);
  let newId = identifier.id;

  if (id !== newId) {
    let keyOptions = getLookupBucket(store, identifier.type);
    if (keyOptions.id[newId] !== undefined) {
      throw new Error('Already used id');
    }
    keyOptions.id[newId] = identifier;
  }
}

function getLookupBucket(store, type) {
  let typeMap: TDict<TmodelName, IKeyOptions> = STORE_MAP.get(store);

  if (typeMap === undefined) {
    typeMap = Object.create(null);
    STORE_MAP.set(store, typeMap);
  }

  let keyOptions: IKeyOptions = typeMap[type];
  if (keyOptions === undefined) {
    keyOptions = {
      lid: Object.create(null),
      id: Object.create(null),
    };
    typeMap[type] = keyOptions;
  }

  return keyOptions;
}

export function recordIdentifierFor(
  store: Store,
  resourceIdentifier: IResourceIdentifier
): RecordIdentifier | null {
  let keyOptions = getLookupBucket(store, resourceIdentifier.type);

  let identifier: RecordIdentifier;
  let lid = coerceId(resourceIdentifier.lid);
  let id = coerceId(resourceIdentifier.id);
  let hasLid = lid !== null && lid.length > 0;
  let hasId = id !== null && id.length > 0;

  if (DEBUG) {
    if (!hasId && !hasLid) {
      throw new Error('Resource Identifiers must have either an `id` or an `lid` on them');
    }
  }

  if (hasLid) {
    identifier = keyOptions.lid[lid];
  }

  if (identifier === undefined && hasId) {
    identifier = keyOptions.id[id];
  }

  if (identifier === undefined && (hasId || hasLid)) {
    identifier = new RecordIdentifier(resourceIdentifier);

    keyOptions.lid[identifier.lid] = identifier;
    if (hasId) {
      keyOptions.id[id] = identifier;
    }
  }

  return identifier || null;
}
