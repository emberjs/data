import Ember from 'ember';
import isEnabled from 'ember-data/-private/features';

const { get } = Ember;

const MUTATION_METHODS = [
  'addObject',
  'addObjects',
  'removeObject',
  'removeObjects',
  'unshiftObject',
  'unshiftObjects',
  'pushObject',
  'pushObjects',
  'reverseObjects',
  'setObjects',
  'shiftObject'
];

function useToArray() {
  if (isEnabled('ds-better-adapter-populated-record-array-error-messages')) {
    let type = get(this, 'type').toString();
    throw new Error(`The result of a server query (on ${type}) is immutable. Use .toArray() to copy the array instead.`);
  } else {
    return this._super(...arguments);
  }
}

const ImmutableArrayMixin = MUTATION_METHODS.reduce((mixin, method) => {
  mixin[method] = useToArray;
  return mixin;
}, {});

export default Ember.Mixin.create(ImmutableArrayMixin);
