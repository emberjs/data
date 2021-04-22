import { assert, deprecate, inspect, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

import { gte } from 'ember-compatibility-helpers';

import { schemaCacheFor, tagged } from './model';

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;

const { _setClassicDecorator } = Ember;

type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: any }) | undefined;

function isElementDescriptor(args: any[]): args is [object, string, DecoratorPropertyDescriptor] {
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

function computedMacroWithOptionalParams(fn) {
  if (gte('3.10.0')) {
    return (...maybeDesc: any[]) => (isElementDescriptor(maybeDesc) ? fn()(...maybeDesc) : fn(...maybeDesc));
  } else {
    return fn;
  }
}

interface PropertyMeta {
  type?: string;
  options: Dict<any>;
  kind: string;
  name: string;
  /**
   * Alias of name
   * @deprecated
   */
  key?: string;
  isRelationship?: true;
  isAttribute?: true;
}

const assertProps =
  DEBUG &&
  function assertProps(target, meta) {
    const { name, kind, options } = meta;
    if (['_internalModel', 'currentState'].indexOf(name) !== -1) {
      throw new Error(
        `'${name}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${target.toString()}`
      );
    }
    if (kind !== 'attribute') {
      if (Object.prototype.hasOwnProperty.call(options, 'serialize')) {
        warn(
          `You provided a serialize option on the "${name}" property in the "${target.toString()}" class, this belongs in the serializer. See Serializer and it's implementations https://api.emberjs.com/ember-data/release/classes/Serializer`,
          false,
          {
            id: 'ds.model.serialize-option-in-belongs-to',
          }
        );
      }
      if (Object.prototype.hasOwnProperty.call(options, 'embedded')) {
        warn(
          `You provided an embedded option on the "${name}" property in the "${target.toString()}" class, this belongs in the serializer. See EmbeddedRecordsMixin https://api.emberjs.com/ember-data/release/classes/EmbeddedRecordsMixin`,
          false,
          {
            id: 'ds.model.embedded-option-in-belongs-to',
          }
        );
      }
    }
  };

export function makeDecorator(kind, descriptor) {
  function relationship(type, options) {
    if (typeof type === 'object') {
      options = type;
      type = undefined;
    }

    if (kind !== 'attribute') {
      assert(
        `The first argument to ${kind} must be a string representing a model type, not an instance of ${inspect(
          type
        )}. E.g., to define a relation to the Comment model, use ${kind}('comment')`,
        typeof type === 'string' || typeof type === 'undefined'
      );
    }

    options = options || {};

    // Metadata about relationships is stored on the meta of
    // the relationship. This is used for introspection and
    // serialization. Note that `name` is populated lazily
    // the first time the CP is called.
    // `key` is a to-be deprecated alias to `name`.
    const meta: PropertyMeta = {
      type,
      options,
      kind: kind,
      name: '',
    };
    const schemaKind = kind === 'attribute' ? 'attributes' : 'relationships';
    if (kind !== 'attribute') {
      meta.isRelationship = true;
    } else {
      meta.isAttribute = true;
    }

    function buildDescriptor(target, key) {
      meta.name = key;
      if (meta.isRelationship) {
        meta.key = key;
      }
      if (DEBUG && assertProps) {
        assertProps(target.constructor, meta);
      }
      let schema = schemaCacheFor(target.constructor);
      schema[schemaKind] = schema[schemaKind] || new Map();
      schema[schemaKind].set(key, meta);
      const get = descriptor.getter(key, meta);
      const set = descriptor.setter(key, meta);

      const desc = tagged(target, key, {
        configurable: true,
        enumerable: true,
        get,
        set,
      });

      return desc;
    }

    // enable use with `Model.extend({})` syntax
    _setClassicDecorator(buildDescriptor, true);

    buildDescriptor.meta = function() {
      deprecate(`calling this is deprecated`, false, {
        id: 'ember-data:computed-meta',
        until: '4.3',
        for: '@ember-data/model',
        since: {
          available: '3.28',
          enabled: '4.1',
        },
      });
      return meta;
    };

    return buildDescriptor;
  }

  return computedMacroWithOptionalParams(relationship);
}
