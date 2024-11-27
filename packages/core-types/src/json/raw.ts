export type PrimitiveValue = string | number | boolean | null;
export interface ObjectValue {
  [key: string]: Value;
}
export type ArrayValue = Value[];

export type Value = PrimitiveValue | ArrayValue | ObjectValue;
