// export const preventNever: unique symbol = Symbol('--___Ignore_me');
export interface Registry {
  // Typescript needs at least one key for the keyof operator to not return `never`
  // which could make our types difficult to work with.
  // activate this if we are having trouble
  // because it is a symbol and not a string it should be extra nice
  // [preventNever]: undefined;
}

export interface ModelRegistry extends Registry {}
export interface AdapterRegistry extends Registry {}
export interface SerializerRegistry extends Registry {}
export interface TransformRegistry extends Registry {}
