import Mixin from '@ember/object/mixin';
import Evented from '@ember/object/evented';
import { deprecate } from '@ember/debug';

const deprecationMessagePrefix = 'Using Ember.Evented with ember data is deprecated.';
const deprecatOptions = {
  id: 'ember-evented',
  until: '3.12',
};

export default Mixin.create(Evented, {
  has(name) {
    deprecate(
      `${deprecationMessagePrefix} \n\n"has()" was used called with ${name}`,
      false,
      deprecatOptions
    );
    return this._super(...arguments);
  },

  off(name, target, method) {
    deprecate(
      `${deprecationMessagePrefix} \n\n"off()" was used called with ${name}.${target}, ${method}`,
      false,
      deprecatOptions
    );
    return this._super(...arguments);
  },

  on(name, target, method) {
    deprecate(
      `${deprecationMessagePrefix} \n\n"on()" was used called with ${name}.${target}, ${method}`,
      false,
      deprecatOptions
    );
    return this._super(...arguments);
  },

  one(name, target, method) {
    deprecate(
      `${deprecationMessagePrefix} \n\n"one()" was used called with ${name}.${target}, ${method}`,
      false,
      deprecatOptions
    );
    return this._super(...arguments);
  },

  trigger(name) {
    deprecate(
      `${deprecationMessagePrefix} \n\n"trigger()" was used called with ${name}`,
      false,
      deprecatOptions
    );
    return this._super(...arguments);
  },
});
