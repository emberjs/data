import { Value as JSONValue } from 'json-typescript';

export type Meta = { [k: string]: JSONValue };
export type Dict<K extends string, V> = { [KK in K]: V };

export interface ResourceIdentifier {
  id: string | null;
  lid?: string;
  type: string;
  // json-api spec does not allow for `null` here
  //   but we do for allowing users to `reset` or
  //   otherwise `empty` their meta cache
  meta?: Meta | null;
}

export interface RecordIdentifier extends ResourceIdentifier {
  // we are more strict that ResourceIdentifier in that `lid` MUST be present
  lid: string;
  // we always have a meta property, null if "none"
  meta: Meta | null;
}

export interface LegacyResourceIdentifier extends ResourceIdentifier {
  clientId?: string;
}

export interface LegacyRecordIdentifier extends RecordIdentifier {
  clientId?: string;
  toString(): string;
}
