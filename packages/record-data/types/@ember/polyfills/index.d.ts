/**
 * Copy properties from a source object to a target object.
 * https://github.com/DefinitelyTyped/DefinitelyTyped/issues/38681
 */
export function assign<T extends object, U extends object | null | undefined>(target: T, source: U): Mix<T, U>;
export function assign<T extends object, U extends object, V extends object | null | undefined>(
  target: T,
  source1: U,
  source2: V
): Mix3<T, U, V>;
export function assign<T extends object, U extends object, V extends object, W extends object | null | undefined>(
  target: T,
  source1: U,
  source2: V,
  source3: W
): Mix4<T, U, V, W>;
