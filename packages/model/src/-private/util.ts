import { deprecate } from '@ember/debug';
import { dasherize } from '@ember/string';

import { DEPRECATE_NON_STRICT_TYPES } from '@warp-drive/build-config/deprecations';

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

export type DataDecorator = (
  target: object,
  key: string,
  desc?: DecoratorPropertyDescriptor
) => DecoratorPropertyDescriptor;
export type DataDecoratorFactory = (...args: unknown[]) => DataDecorator;

export function computedMacroWithOptionalParams(fn: DataDecorator | DataDecoratorFactory) {
  return (...maybeDesc: unknown[]) =>
    isElementDescriptor(maybeDesc)
      ? (fn as DataDecoratorFactory)()(...maybeDesc)
      : fn(...(maybeDesc as [object, string, DecoratorPropertyDescriptor?]));
}

export function normalizeModelName(type: string): string {
  if (DEPRECATE_NON_STRICT_TYPES) {
    const result = dasherize(type);

    deprecate(
      `The resource type '${type}' is not normalized. Update your application code to use '${result}' instead of '${type}'.`,
      result === type,
      {
        id: 'ember-data:deprecate-non-strict-types',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '5.3',
          enabled: '5.3',
        },
      }
    );

    return result;
  }

  return type;
}
