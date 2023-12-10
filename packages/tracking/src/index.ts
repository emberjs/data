import { createCache, getValue } from '@glimmer/tracking/primitives/cache';

import { assert } from '@ember-data/macros';

export { transact, memoTransact, untracked } from './-private';

// temporary so we can remove the glimmer and ember imports elsewhere
// eslint-disable-next-line no-restricted-imports
export { dependentKeyCompat as compat } from '@ember/object/compat';

export function cached<T extends object, K extends keyof T & string>(
  target: T,
  key: K,
  descriptor: PropertyDescriptor
) {
  // Error on `@cached()`, `@cached(...args)`, and `@cached propName = value;`
  assert(
    'You attempted to use @cached(), which is not necessary nor supported. Remove the parentheses and you will be good to go!',
    target !== undefined
  );
  assert(
    `You attempted to use @cached on with ${arguments.length > 1 ? 'arguments' : 'an argument'} ( @cached(${Array.from(
      arguments
    )
      .map((d) => `'${d}'`)
      .join(
        ', '
      )}), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@cached`'}`,
    typeof target === 'object' && typeof key === 'string' && typeof descriptor === 'object' && arguments.length === 3
  );
  assert(
    `The @cached decorator must be applied to getters. '${key}' is not a getter.`,
    typeof descriptor.get === 'function'
  );

  const caches = new WeakMap<object, object>();
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = descriptor.get;
  descriptor.get = function () {
    if (!caches.has(this)) caches.set(this, createCache(getter.bind(this)));
    return getValue<unknown>(caches.get(this) as Parameters<typeof getValue>[0]);
  };
}

export { createCache, getValue };
