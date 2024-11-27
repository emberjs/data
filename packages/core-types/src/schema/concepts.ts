import type { StableRecordIdentifier } from '../identifier';
import type { ObjectValue, Value } from '../json/raw';
import type { OpaqueRecordInstance } from '../record';
import type { Type } from '../symbols';

export type Transformation<T extends Value = Value, PT = unknown> = {
  serialize(value: PT, options: ObjectValue | null, record: OpaqueRecordInstance): T;
  hydrate(value: T | undefined, options: ObjectValue | null, record: OpaqueRecordInstance): PT;
  defaultValue?(options: ObjectValue | null, identifier: StableRecordIdentifier): T;
  [Type]: string;
};

export type Derivation<R = unknown, T = unknown, FM extends ObjectValue | null = ObjectValue | null> = {
  [Type]: string;
} & ((record: R, options: FM, prop: string) => T);

export type HashFn<T extends object = object> = { [Type]: string } & ((
  data: T,
  options: ObjectValue | null,
  prop: string | null
) => string);
