import type { Includes, TypedRecordInstance } from './record';

export type SerializablePrimitive = string | number | boolean | null;
export type Serializable = SerializablePrimitive | SerializablePrimitive[];
export type QueryParamsSerializationOptions = {
  arrayFormat?: 'bracket' | 'indices' | 'repeat' | 'comma';
};
export type QueryParamsSource<T = unknown> =
  | ({ include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[] } & Record<
      Exclude<string, 'include'>,
      Serializable
    >)
  | URLSearchParams;
