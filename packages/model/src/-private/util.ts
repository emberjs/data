import { dasherize } from '@ember-data/request-utils/string';

export type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: () => unknown }) | undefined;

export function isElementDescriptor(args: unknown[]): args is [object, string, DecoratorPropertyDescriptor] {
  const [maybeTarget, maybeKey, maybeDesc] = args;

  return (
    // Ensure we have the right number of args
    args.length === 3 &&
    // Make sure the target is a class or object (prototype)
    (typeof maybeTarget === 'function' || (typeof maybeTarget === 'object' && maybeTarget !== null)) &&
    // Make sure the key is a string
    typeof maybeKey === 'string' &&
    // Make sure the descriptor is the right shape
    ((typeof maybeDesc === 'object' &&
      maybeDesc !== null &&
      'enumerable' in maybeDesc &&
      'configurable' in maybeDesc) ||
      // TS compatibility
      maybeDesc === undefined)
  );
}

export function normalizeModelName(type: string): string {
  return dasherize(type);
}
