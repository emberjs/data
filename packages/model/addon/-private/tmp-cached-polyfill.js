import { assert } from '@ember/debug';
import { createCache, getValue } from '@glimmer/tracking/primitives/cache';

/*
 * Implements the @cached decorator from Ember. Ported from ember-cached-decorator-polyfill
 *
 * This can be removed once the polyfill works with ember 3.27+
 * See: https://github.com/ember-polyfills/ember-cached-decorator-polyfill/issues/70
 */
export default function cached(...args) {
  const [target, key, descriptor] = args; // Error on `@cached()`, `@cached(...args)`, and `@cached propName = value;`

  true &&
    !(target !== undefined) &&
    assert(
      'You attempted to use @cached(), which is not necessary nor supported. Remove the parentheses and you will be good to go!',
      target !== undefined
    );
  true &&
    !(typeof target === 'object' && typeof key === 'string' && typeof descriptor === 'object' && args.length === 3) &&
    assert(
      `You attempted to use @cached on with ${args.length > 1 ? 'arguments' : 'an argument'} ( @cached(${args
        .map((d) => `'${d}'`)
        .join(
          ', '
        )}), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@cached`'}`,
      typeof target === 'object' && typeof key === 'string' && typeof descriptor === 'object' && args.length === 3
    );
  true &&
    !(typeof descriptor.get === 'function') &&
    assert(
      `The @cached decorator must be applied to getters. '${key}' is not a getter.`,
      typeof descriptor.get === 'function'
    );
  const caches = new WeakMap();
  const getter = descriptor.get;

  descriptor.get = function () {
    if (!caches.has(this)) caches.set(this, createCache(getter.bind(this)));
    return getValue(caches.get(this));
  };
}
