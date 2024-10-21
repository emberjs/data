import type { Includes, TypedRecordInstance } from './record';

export type SerializablePrimitive = string | number | boolean | null;
export type Serializable = SerializablePrimitive | SerializablePrimitive[];
export type QueryParamsSerializationOptions = {
  arrayFormat?: 'bracket' | 'indices' | 'repeat' | 'comma';
};

export type _StringSatisfiesIncludes<T extends string, SET extends string, FT extends string> = T extends SET
  ? FT
  : T extends `${infer U},${infer V}`
    ? U extends SET
      ? _StringSatisfiesIncludes<V, Exclude<SET, U>, FT>
      : never
    : never;

export type StringSatisfiesIncludes<T extends string, SET extends string> = _StringSatisfiesIncludes<T, SET, T>;

export type QueryParamsSource<T = unknown> =
  | ({ include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[] } & Record<
      Exclude<string, 'include'>,
      Serializable
    >)
  | URLSearchParams;

export function createIncludeValidator<T extends TypedRecordInstance>() {
  return function validateIncludes<U extends string>(includes: StringSatisfiesIncludes<U, Includes<T>>): U {
    return includes;
  };
}
