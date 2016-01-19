/*jshint node:true*/

var extendFromApplicationEntity = require('../../lib/utilities/extend-from-application-entity');

module.exports = {
  description: 'Generates an ember-data serializer.',

  availableOptions: [
    { name: 'base-class', type: String }
  ],

  locals: function(options) {
    return extendFromApplicationEntity('serializer', 'JSONAPISerializer', 'ember-data/serializers/json-api', options);
  }
};
