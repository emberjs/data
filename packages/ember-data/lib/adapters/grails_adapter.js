require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/grails_serializer');
/*global jQuery*/

DS.GrailsAdapter = DS.RESTAdapter.extend({
  serializer: DS.GrailsSerializer,
  namespace:  "grails.app.context",
  buildURL: function(record, suffix) {
    Ember.assert("Namespace URL should be overridden and set to the application prefix (e.g., grails.app.context)", this.namespace !== "grails.app.context");
    return this._super(record, suffix);
  }
});