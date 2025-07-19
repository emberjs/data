import type { ResourceKey } from '../identifier.ts';
import type { ObjectValue, Value } from '../json/raw.ts';
import type { OpaqueRecordInstance } from '../record.ts';
import type { Type } from '../symbols.ts';

export type Transformation<T extends Value = Value, PT = unknown> = {
  serialize(value: PT, options: ObjectValue | null, record: OpaqueRecordInstance): T;
  hydrate(value: T | undefined, options: ObjectValue | null, record: OpaqueRecordInstance): PT;
  defaultValue?(options: ObjectValue | null, identifier: ResourceKey): T;
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
