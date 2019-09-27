import setupContainer from 'ember-data/setup-container';
import 'ember-data';

/*
  This code initializes EmberData in an Ember application.

  It ensures that the `store` service is automatically injected
  as the `store` property on all routes and controllers.
*/
export default {
  name: 'ember-data',
  initialize: setupContainer,
};
