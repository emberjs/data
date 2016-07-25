/* eslint-env node */

var extendFromApplicationEntity = require('../../lib/utilities/extend-from-application-entity');

module.exports = {
  description: 'Generates an ember-data serializer.',

  availableOptions: [
    { name: 'base-class', type: String }
  ],

  locals: function(options) {
    return extendFromApplicationEntity('serializer', 'DS.JSONAPISerializer', options);
  }
};
