/* eslint-env node */

var ModelBlueprint = require('../model');
var testInfo = require('ember-cli-test-info');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a model unit test.',

  locals: function(options) {
    var result = ModelBlueprint.locals.apply(this, arguments);

    result.friendlyDescription = testInfo.description(options.entity.name, "Unit", "Model");

    return result;
  }
});
