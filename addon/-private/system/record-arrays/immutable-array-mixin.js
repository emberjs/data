import Ember from 'ember';
import isEnabled from 'ember-data/-private/features';

const {
   get,
   Error: EmberError
} = Ember;

const MUTATION_METHODS = [
  'addObject',
  'addObjects',
  'clear',
  'insertAt',
  'popObject',
  'pushObject',
  'pushObjects',
  'removeAt',
  'removeObject',
  'removeObjects',
  'reverseObjects',
  'setObjects',
  'shiftObject',
  'unshiftObject',
  'unshiftObjects'
];

function useToArray() {
  let type = get(this, 'type').toString();
  throw new EmberError(`The result of a server query (on ${type}) is immutable. Use .toArray() to copy the array instead.`);
}

let ImmutableArrayMixin = {};

if (isEnabled('ds-better-adapter-populated-record-array-error-messages')) {
  MUTATION_METHODS.forEach((method) => {
    ImmutableArrayMixin[method] = useToArray;
  });
}

export default Ember.Mixin.create(ImmutableArrayMixin);
