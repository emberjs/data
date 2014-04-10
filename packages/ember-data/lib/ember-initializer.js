import setupContainer from './setup-container';

/**
  @module ember-data

  This code initializes Ember-Data onto an Ember application.
*/

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name:       "ember-data",
    initialize: setupContainer
  });
});
