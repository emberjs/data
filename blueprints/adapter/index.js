/*jshint node:true*/

var extendFromApplicationEntity = require('../../lib/utilities/extend-from-application-entity');

module.exports = {
  description: 'Generates an ember-data adapter.',

  availableOptions: [
    { name: 'base-class', type: String }
  ],

  locals: function(options) {
    return extendFromApplicationEntity('adapter', 'JSONAPIAdapter', 'ember-data/adapters/json-api', options);
  }
};
