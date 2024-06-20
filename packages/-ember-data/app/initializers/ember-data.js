import '@ember-data/request-utils/deprecation-support';

/*
  This code initializes EmberData in an Ember application.
*/
export default {
  name: 'ember-data',
  initialize(application) {
    application.registerOptionsForType('serializer', { singleton: false });
    application.registerOptionsForType('adapter', { singleton: false });
  },
};
