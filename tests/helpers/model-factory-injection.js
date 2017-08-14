import Ember from 'ember';
import hasEmberVersion from 'ember-test-helpers/has-ember-version';

let ORIGINAL_MODEL_FACTORY_INJECTIONS = Ember.MODEL_FACTORY_INJECTIONS;

export function setup(value = true) {
  if (!hasEmberVersion(2, 14)) {
    Ember.MODEL_FACTORY_INJECTIONS = value;
  }
}

export function reset() {
  setup(ORIGINAL_MODEL_FACTORY_INJECTIONS);
}
