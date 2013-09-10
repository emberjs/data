require('ember-data/adapters/rest_adapter');
require('ember-data/serializers/active_model_serializer');

/**
  DS.ActiveModelAdapter

  TODO: Description

  @class ActiveModelAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
**/

DS.ActiveModelAdapter = DS.RESTAdapter.extend({
  defaultSerializer: '_ams',
  pathForType: function(type) {
    var decamelized = Ember.String.decamelize(type);
    return Ember.String.pluralize(decamelized);
  }
});