import Ember from 'ember';

/*
  This initializer is here to keep backwards compatibility with code depending
  on the `injectStore` initializer (before Ember Data was an addon).

  Should be removed for Ember Data 3.x
*/

export default {
  name: 'injectStore',
  before: 'store',
  initialize: Ember.K
};
