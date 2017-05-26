/*
  This initializer is here to keep backwards compatibility with code depending
  on the `data-adapter` initializer (before Ember Data was an addon).

  Should be removed for Ember Data 3.x
*/

export default {
  name: 'data-adapter',
  before: 'store',
  initialize() {}
};
