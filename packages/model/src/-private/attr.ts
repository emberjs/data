/**
  @module @ember-data/model
*/
import { assert } from '@ember/debug';
import { computed } from '@ember/object';

import { recordIdentifierFor } from '@ember-data/store';
import { peekCache } from '@ember-data/store/-private';
import { DEBUG } from '@warp-drive/build-config/env';
import type { ArrayValue, ObjectValue, PrimitiveValue, Value } from '@warp-drive/core-types/json/raw';
import type { TransformName } from '@warp-drive/core-types/symbols';

import type { Model } from './model';
import type { DecoratorPropertyDescriptor } from './util';
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
 * @class NOTATHING
 * @typedoc
 */
export type AttrOptions<DV = PrimitiveValue | object | unknown[]> = {
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
  defaultValue?: DV extends PrimitiveValue ? DV : () => DV;
};

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
          const { errors } = this;
          if (errors.get(key)) {
            errors.remove(key);
            this.currentState.cleanErrorRequests();
          }
        }
      }

      return value;
    },
  }).meta(meta);
}

// NOTE: Usage of Explicit ANY
// -------------------------------------------------------------------
// any is required here because we are the maximal not the minimal
// subset of options allowed. If we used unknown, object, or
// Record<string, unknown> we would get type errors when we try to
// assert against a more specific implementation with precise options.
// -------------------------------------------------------------------

type LooseTransformInstance<V, Raw, Name extends string> = {
  /**
   * value type must match the return type of the deserialize method
   *
   * @typedoc
   */
  // see note on Explicit ANY above
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize: (value: V, options: any) => Raw;
  /**
   * defaultValue type must match the return type of the deserialize method
   *
   * @typedoc
   */
  // see note on Explicit ANY above
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deserialize: (value: Raw, options: any) => V;

  [TransformName]: Name;
};
export type TransformHasType = { [TransformName]: string };

export type TypedTransformInstance<V, T extends string> =
  | LooseTransformInstance<V, string, T>
  | LooseTransformInstance<V, number, T>
  | LooseTransformInstance<V, boolean, T>
  | LooseTransformInstance<V, null, T>
  | LooseTransformInstance<V, ObjectValue, T>
  | LooseTransformInstance<V, ArrayValue, T>;

// see note on Explicit ANY above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GetMaybeDeserializeValue<T> = T extends { deserialize: (...args: any[]) => unknown }
  ? ReturnType<T['deserialize']>
  : never;

export type TypeFromInstance<T> = T extends TransformHasType ? T[typeof TransformName] : never;
export type OptionsFromInstance<T> =
  TypeFromInstance<T> extends never
    ? never
    : GetMaybeDeserializeValue<T> extends never
      ? never
      : T extends TypedTransformInstance<GetMaybeDeserializeValue<T>, TypeFromInstance<T>>
        ? Parameters<T['deserialize']>[1] & Parameters<T['serialize']>[1] & AttrOptions<ReturnType<T['deserialize']>>
        : never;

/**
 * The return type of `void` is a lie to appease TypeScript. The actual return type
 * is a descriptor, but typescript incorrectly insists that decorator functions return
 * `void` or `any`.
 *
 * @typedoc
 */
export type DataDecorator = (target: object, key: string, desc?: DecoratorPropertyDescriptor) => void;

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
export function attr(): DataDecorator;
export function attr<T>(type: TypeFromInstance<T>): DataDecorator;
export function attr(type: string): DataDecorator;
export function attr(options: AttrOptions): DataDecorator;
export function attr<T>(type: TypeFromInstance<T>, options?: OptionsFromInstance<T>): DataDecorator;
export function attr(type: string, options?: AttrOptions & object): DataDecorator;
export function attr(target: object, key: string | symbol, desc?: PropertyDescriptor): void; // see note on DataDecorator for why void
export function attr(
  type?: string | AttrOptions | object,
  options?: (AttrOptions & object) | string | symbol,
  desc?: PropertyDescriptor
): DataDecorator | void {
  const args = [type, options, desc];
  // see note on DataDecorator for why void
  return isElementDescriptor(args) ? (_attr()(...args) as void) : _attr(type, options as object);
}
