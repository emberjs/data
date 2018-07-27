var ModelBlueprint = require('../model');
var testInfo = require('ember-cli-test-info');
var useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../../lib/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates a model unit test.',

  locals: function(options) {
    var result = ModelBlueprint.locals.apply(this, arguments);

    result.friendlyTestDescription = testInfo.description(options.entity.name, 'Unit', 'Model');

    return result;
  },

  fileMapTokens(options) {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__() {
          return 'src';
        },
        __path__(options) {
          return path.join('data', 'models', options.dasherizedModuleName);
        },
        __test__() {
          return 'model-test';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __path__() {
          return path.join('unit', 'models');
        },
      };
    }
  },
});
