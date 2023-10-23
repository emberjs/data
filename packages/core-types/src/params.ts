export type SerializablePrimitive = string | number | boolean | null;
export type Serializable = SerializablePrimitive | SerializablePrimitive[];
export type QueryParamsSerializationOptions = {
  arrayFormat?: 'bracket' | 'indices' | 'repeat' | 'comma';
};
export type QueryParamsSource = Record<string, Serializable> | URLSearchParams;
