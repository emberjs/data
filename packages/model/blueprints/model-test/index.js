const path = require('path');

const testInfo = require('ember-cli-test-info');
const useTestFrameworkDetector = require('@ember-data/private-build-infra/src/utilities/test-framework-detector');

const ModelBlueprint = require('../model');

module.exports = useTestFrameworkDetector({
  description: 'Generates a model unit test.',

  root: __dirname,

  fileMapTokens(options) {
    return {
      __root__() {
        return 'tests';
      },
      __path__() {
        return path.join('unit', 'models');
      },
    };
  },

  locals(options) {
    const result = ModelBlueprint.locals.apply(this, arguments);

    result.friendlyTestDescription = testInfo.description(options.entity.name, 'Unit', 'Model');

    return result;
  },
});
