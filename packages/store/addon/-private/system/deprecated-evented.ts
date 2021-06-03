import { deprecate } from '@ember/debug';
import Evented from '@ember/object/evented';
import Mixin from '@ember/object/mixin';
import { DEBUG } from '@glimmer/env';

import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

type EmberObject = import('@ember/object').default;

interface PrivateEvented extends Evented {
  mixins: { properties: Evented }[];
}
type DeprecatedEvented = EmberObject &
  Evented & {
    _getDeprecatedEventedInfo(): string;
    _deprecateEvented(eventName: string): void;
    _has(name: string): boolean;
    _on(...args: Parameters<Evented['on']>): ReturnType<Evented['on']>;
  };

/**
  @module @ember-data/store
*/
type DeprecationsList = {};
let INSTANCE_DEPRECATIONS: WeakMap<DeprecatedEvented, DeprecationsList>;
let lookupDeprecations: (instance: DeprecatedEvented) => DeprecationsList;
let DeprecatedEvented;

if (DEBUG) {
  INSTANCE_DEPRECATIONS = new WeakMap();

  lookupDeprecations = function lookupInstanceDrecations(instance: DeprecatedEvented): DeprecationsList {
    let deprecations = INSTANCE_DEPRECATIONS.get(instance);

    if (!deprecations) {
      deprecations = {};
      INSTANCE_DEPRECATIONS.set(instance, deprecations);
    }

    return deprecations;
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
  DeprecatedEvented = Mixin.create(Evented, {
    _has(name: string): boolean {
      return (Evented as unknown as PrivateEvented).mixins[0].properties.has.call(this, name);
    },

    _on(...args: Parameters<Evented['on']>) {
      return (Evented as unknown as PrivateEvented).mixins[0].properties.on.call(this, ...args);
    },

    _deprecateEvented(eventName: string) {
      let deprecations = lookupDeprecations(this);
      const _deprecationData = this._getDeprecatedEventedInfo ? `on ${this._getDeprecatedEventedInfo()}` : '';
      const deprecationMessage = _deprecationData ? `Called ${eventName} ${_deprecationData}` : eventName;
      deprecate(deprecationMessage, deprecations[eventName], {
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

    has(name: string): boolean {
      this._deprecateEvented(name);
      return this._super(name) as boolean;
    },

    off(...args: Parameters<Evented['off']>): ReturnType<Evented['off']> {
      this._deprecateEvented(args[0]);
      return this._super(...args) as ReturnType<Evented['off']>;
    },

    on(...args: Parameters<Evented['on']>): ReturnType<Evented['on']> {
      this._deprecateEvented(args[0]);
      return this._super(...args) as ReturnType<Evented['on']>;
    },

    one(...args: Parameters<Evented['one']>): ReturnType<Evented['one']> {
      this._deprecateEvented(args[0]);
      return this._super(...args) as ReturnType<Evented['one']>;
    },

    trigger(name: string): void {
      this._deprecateEvented(name);
      this._super(name);
    },
  } as DeprecatedEvented);
}

export default (DEPRECATE_EVENTED_API_USAGE ? (DEBUG ? DeprecatedEvented : Evented) : {}) as Evented;
