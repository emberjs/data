import { gte } from 'ember-compatibility-helpers';

export type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: any }) | undefined;

export function isElementDescriptor(args: any[]): args is [object, string, DecoratorPropertyDescriptor] {
  let [maybeTarget, maybeKey, maybeDesc] = args;

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

export function computedMacroWithOptionalParams(fn) {
  if (gte('3.10.0')) {
    return (...maybeDesc: any[]) => (isElementDescriptor(maybeDesc) ? fn()(...maybeDesc) : fn(...maybeDesc));
  } else {
    return fn;
  }
}
