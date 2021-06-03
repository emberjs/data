import { deprecate } from '@ember/debug';
import Evented from '@ember/object/evented';
import Mixin from '@ember/object/mixin';
import { DEBUG } from '@glimmer/env';

import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

type Dict<T> = import('../ts-interfaces/utils').Dict<T>;
type EmberObject = import('@ember/object').default;

type DeprecationsList = Dict<true>;

// We require the ability to super into the mixin
// from another method, with Mixins this is how
// we achieve accessing them, since native `super.<method>`
// is not available.
interface PrivateEvented extends Evented {
  mixins: { properties: Evented }[];
}

// We don't directly extend the Evented type as the `this` type
// would error on us. We also don't directly extend the EmberObject
// type as that would result in us needing to define all of those
// in our implementation.
// Instead we specify the Evented methods directly on our
// deprecated interface and set the `this` context to include
// EmberObject when needed so as to gain _super ability
interface DeprecatedEvented {
  _getDeprecatedEventedInfo?(): string; // optionally implemented by consumers
  _deprecateEvented(eventName: string): void;
  has(name: string): boolean;
  _has(name: string): boolean;
  _on(...args: Parameters<Evented['on']>): ReturnType<Evented['on']>;
  on(...args: Parameters<Evented['on']>): ReturnType<Evented['on']>;
  one(...args: Parameters<Evented['one']>): ReturnType<Evented['one']>;
  off(...args: Parameters<Evented['off']>): ReturnType<Evented['off']>;
  trigger(...args: Parameters<Evented['trigger']>): void;
}

/**
  @module @ember-data/store
*/
let DeprecatedEvented!: Mixin<DeprecatedEvented, EmberObject>;

if (DEBUG) {
  let INSTANCE_DEPRECATIONS: WeakMap<DeprecatedEvented, DeprecationsList> = new WeakMap();

  const lookupDeprecations = function lookupDeprecationsForInstance(instance: DeprecatedEvented): DeprecationsList {
    let deprecations = INSTANCE_DEPRECATIONS.get(instance);

    if (!deprecations) {
      deprecations = {};
      INSTANCE_DEPRECATIONS.set(instance, deprecations);
    }

    return deprecations;
  };

  // creating our Mixin this way allows us to avoid casting the object when we pass it to the Mixin.
  // which ensures that if we make changes to the interface in the future we will error in the implementation
  // if not aligned.
  const EventedOverrides: DeprecatedEvented = {
    _has(name: string): boolean {
      return (Evented as unknown as PrivateEvented).mixins[0].properties.has.call(this, name);
    },

    _on(...args: Parameters<Evented['on']>) {
      return (Evented as unknown as PrivateEvented).mixins[0].properties.on.call(this, ...args);
    },

    _deprecateEvented(this: DeprecatedEvented, eventName: string) {
      let deprecations = lookupDeprecations(this);
      const _deprecationData = this._getDeprecatedEventedInfo ? `on ${this._getDeprecatedEventedInfo()}` : '';
      const deprecationMessage = _deprecationData ? `Called ${eventName} ${_deprecationData}` : eventName;
      deprecate(deprecationMessage, deprecations[eventName] || false, {
        id: 'ember-data:evented-api-usage',
        until: '4.0',
        url: 'https://deprecations.emberjs.com/ember-data/v3.x/#deprecatingrecordlifecycleeventmethods',
        for: '@ember-data/model',
        since: {
          available: '3.12',
          enabled: '3.12',
        },
      });
      deprecations[eventName] = true;
    },

    has(this: DeprecatedEvented & EmberObject, name: string): boolean {
      this._deprecateEvented(name);
      return this._super(name) as boolean;
    },

    off(this: DeprecatedEvented & EmberObject, ...args: Parameters<Evented['off']>): ReturnType<Evented['off']> {
      this._deprecateEvented(args[0]);
      return this._super(...args) as ReturnType<Evented['off']>;
    },

    on(this: DeprecatedEvented & EmberObject, ...args: Parameters<Evented['on']>): ReturnType<Evented['on']> {
      this._deprecateEvented(args[0]);
      return this._super(...args) as ReturnType<Evented['on']>;
    },

    one(this: DeprecatedEvented & EmberObject, ...args: Parameters<Evented['one']>): ReturnType<Evented['one']> {
      this._deprecateEvented(args[0]);
      return this._super(...args) as ReturnType<Evented['one']>;
    },

    trigger(this: DeprecatedEvented & EmberObject, name: string): void {
      this._deprecateEvented(name);
      this._super(name);
    },
  };

  /**
   * `DeprecatedEvented` is a mixin that proxies to the `Ember.Evented`
   * mixin while logging deprecations. It is used by classes that were previously instrumented with
   * Evented whose evented APIs are now deprecated.
   *
   * @class DeprecatedEvented
   * @private
   * @uses Ember.Evented
   */
  DeprecatedEvented = Mixin.create(Evented, EventedOverrides);
}

export default (DEPRECATE_EVENTED_API_USAGE ? (DEBUG ? DeprecatedEvented : Evented) : {}) as Evented;
