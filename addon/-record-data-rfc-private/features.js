import Ember from 'ember';

export default function isEnabled() {
  return Ember.FEATURES.isEnabled(...arguments);
}
