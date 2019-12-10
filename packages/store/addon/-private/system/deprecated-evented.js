import { deprecate } from '@ember/debug';
import Evented from '@ember/object/evented';
import Mixin from '@ember/object/mixin';
import { DEBUG } from '@glimmer/env';

import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

/**
  @module @ember-data/store
*/

let INSTANCE_DEPRECATIONS;
let lookupDeprecations;
let DeprecatedEvented;

if (DEBUG) {
  INSTANCE_DEPRECATIONS = new WeakMap();

  lookupDeprecations = function lookupInstanceDrecations(instance) {
    let deprecations = INSTANCE_DEPRECATIONS.get(instance);

    if (!deprecations) {
      deprecations = {};
      INSTANCE_DEPRECATIONS.set(instance, deprecations);
    }

    return deprecations;
  };

  DeprecatedEvented = Mixin.create(Evented, {
    /**
     * Provides a way to call Evented without logging deprecation warnings
     * @param {String} name
     */
    _has(name) {
      return Evented.mixins[0].properties.has.call(this, name);
    },

    _on() {
      return Evented.mixins[0].properties.on.call(this, ...arguments);
    },

    _deprecateEvented(eventName) {
      let deprecations = lookupDeprecations(this);
      const _deprecationData = this._getDeprecatedEventedInfo ? `on ${this._getDeprecatedEventedInfo()}` : '';
      const deprecationMessage = _deprecationData ? `Called ${eventName} ${_deprecationData}` : eventName;
      deprecate(deprecationMessage, deprecations[eventName], {
        id: 'ember-data:evented-api-usage',
        until: '4.0',
        url: 'https://deprecations.emberjs.com/ember-data/v3.x/#deprecatingrecordlifecycleeventmethods',
      });
      deprecations[eventName] = true;
    },

    has(name) {
      this._deprecateEvented(name);
      return this._super(...arguments);
    },

    off(name, target, method) {
      this._deprecateEvented(name);
      return this._super(...arguments);
    },

    on(name, target, method) {
      this._deprecateEvented(name);
      return this._super(...arguments);
    },

    one(name, target, method) {
      this._deprecateEvented(name);
      return this._super(...arguments);
    },

    trigger(name) {
      this._deprecateEvented(name);
      return this._super(...arguments);
    },
  });
}

export default DEPRECATE_EVENTED_API_USAGE ? (DEBUG ? DeprecatedEvented : Evented) : {};
