import { assert } from '@ember/debug';
import { computed } from '@ember/object';

/**
  @module @ember-data/model
*/
import { expectTypeOf } from 'expect-type';

import { DEBUG } from '@ember-data/env';
import { recordIdentifierFor } from '@ember-data/store';
import { peekCache } from '@ember-data/store/-private';
import type { Value } from '@warp-drive/core-types/json/raw';

import type { Model } from './model';
import type { DataDecorator, DecoratorPropertyDescriptor } from './util';
import { isElementDescriptor } from './util';

/**
 * Options provided to the attr decorator are
 * supplied to the associated transform. Any
 * key-value pair is valid; however, it is highly
 * recommended to only use statically defined values
 * that could be serialized to JSON.
 *
 * If no transform is provided, the only valid
 * option is `defaultValue`.
 *
 * Examples:
 *
 * ```ts
 * class User extends Model {
 *  @attr('string', { defaultValue: 'Anonymous' }) name;
 *  @attr('date', { defaultValue: () => new Date() }) createdAt;
 *  @attr({ defaultValue: () => ({}) }) preferences;
 *  @attr('boolean') hasVerifiedEmail;
 *  @attr address;
 * }
 *
 * @typedoc
 */
type AttrOptions = {
  /**
   * The default value for this attribute.
   *
   * Default values can be provided as a value or a function that will be
   * executed to generate the default value.
   *
   * Default values *should not* be stateful (object, arrays, etc.) as
   * they will be shared across all instances of the record.
   *
   * @typedoc
   */
  defaultValue?: string | number | boolean | null | (() => unknown);
};

/**
  `attr` defines an attribute on a [Model](/ember-data/release/classes/Model).
  By default, attributes are passed through as-is, however you can specify an
  optional type to have the value automatically transformed.
  EmberData ships with four basic transform types: `string`, `number`,
  `boolean` and `date`. You can define your own transforms by subclassing
  [Transform](/ember-data/release/classes/Transform).

  Note that you cannot use `attr` to define an attribute of `id`.

  `attr` takes an optional hash as a second parameter, currently
  supported options are:

  - `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

  Example

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('string') username;
    @attr('string') email;
    @attr('boolean', { defaultValue: false }) verified;
  }
  ```

  Default value can also be a function. This is useful it you want to return
  a new object for each attribute.

  ```app/models/user.js
  import Model, { attr } from '@ember-data/model';

  export default class UserModel extends Model {
    @attr('string') username;
    @attr('string') email;

    @attr({
      defaultValue() {
        return {};
      }
    })
    settings;
  }
  ```

  The `options` hash is passed as second argument to a transforms'
  `serialize` and `deserialize` method. This allows to configure a
  transformation and adapt the corresponding value, based on the config:

  ```app/models/post.js
  import Model, { attr } from '@ember-data/model';

  export default class PostModel extends Model {
    @attr('text', {
      uppercase: true
    })
    text;
  }
  ```

  ```app/transforms/text.js
  export default class TextTransform {
    serialize(value, options) {
      if (options.uppercase) {
        return value.toUpperCase();
      }

      return value;
    }

    deserialize(value) {
      return value;
    }

    static create() {
      return new this();
    }
  }
  ```

  @method attr
  @public
  @static
  @for @ember-data/model
  @param {String|Object} type the attribute type
  @param {Object} options a hash of options
  @return {Attribute}
*/
function _attr(type?: string | AttrOptions, options?: AttrOptions & object) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    options = options || {};
  }

  const meta = {
    type: type,
    kind: 'attribute',
    isAttribute: true,
    options: options,
    key: null,
  };

  return computed({
    get(this: Model, key: string) {
      if (DEBUG) {
        if (['currentState'].includes(key)) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }
      if (this.isDestroyed || this.isDestroying) {
        return;
      }
      return peekCache(this).getAttr(recordIdentifierFor(this), key);
    },
    set(this: Model, key: string, value: Value) {
      if (DEBUG) {
        if (['currentState'].includes(key)) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your attr on ${this.constructor.toString()}`
          );
        }
      }
      const identifier = recordIdentifierFor(this);
      assert(
        `Attempted to set '${key}' on the deleted record ${identifier.type}:${identifier.id} (${identifier.lid})`,
        !this.currentState.isDeleted
      );
      const cache = peekCache(this);

      const currentValue = cache.getAttr(identifier, key);
      if (currentValue !== value) {
        cache.setAttr(identifier, key, value);

        if (!this.isValid) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { errors } = this;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          if (errors.get(key)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            errors.remove(key);
            this.currentState.cleanErrorRequests();
          }
        }
      }

      return value;
    },
  }).meta(meta);
}

export function attr(): DataDecorator;
export function attr(type: string): DataDecorator;
export function attr(options: AttrOptions): DataDecorator;
export function attr(type: string, options?: AttrOptions & object): DataDecorator;
export function attr(target: object, key: string, desc: PropertyDescriptor): DecoratorPropertyDescriptor;
export function attr(
  type?: string | AttrOptions | object,
  options?: (AttrOptions & object) | string,
  desc?: PropertyDescriptor
): DataDecorator | DecoratorPropertyDescriptor {
  const args = [type, options, desc];
  return isElementDescriptor(args) ? _attr()(...args) : _attr(type, options as object);
}

// positive tests
expectTypeOf(attr({}, 'key', {})).toEqualTypeOf<DecoratorPropertyDescriptor>();
expectTypeOf(attr('string')).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr({})).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr('string', {})).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr()).toEqualTypeOf<DataDecorator>();

expectTypeOf(attr('string', { defaultValue: 'hello' })).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr({ defaultValue: 'hello' })).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr('string', { defaultValue: () => {} })).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr({ defaultValue: () => {} })).toEqualTypeOf<DataDecorator>();

/* prettier-ignore */
expectTypeOf(
  // @ts-expect-error
  attr(
    { defaultValue: {} }
  )
).toBeNever;
expectTypeOf(
  attr(
    // @ts-expect-error
    1,
    { defaultValue: 'hello' }
  )
).toBeNever;
