import Mixin from '@ember/object/mixin';
import Evented from '@ember/object/evented';
import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

let DeprecatedEvented = Evented;

if (DEBUG) {
  const printDeprecation = function(ctx) {
    deprecate(
      `Use of event functionality provided by Ember.Evented with ${
        ctx._debugContainerKey
      } has been deprecated.`,
      {
        id: 'ember-data:no-longer-evented',
        until: '3.8',
      }
    );
  };

  DeprecatedEvented = Mixin.create(Evented, {
    has() {
      printDeprecation(this);
      return this._super(...arguments);
    },
    off() {
      printDeprecation(this);
      return this._super(...arguments);
    },
    on() {
      printDeprecation(this);
      return this._super(...arguments);
    },
    one() {
      printDeprecation(this);
      return this._super(...arguments);
    },
    trigger() {
      printDeprecation(this);
      return this._super(...arguments);
    },
  });
}

export default DeprecatedEvented;
