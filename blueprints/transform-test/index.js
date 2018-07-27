var testInfo = require('ember-cli-test-info');
var useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../../lib/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates a transform unit test.',

  locals: function(options) {
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Transform'),
    };
  },

  fileMapTokens(options) {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__() {
          return 'src';
        },
        __path__(options) {
          return path.join('data', 'transforms', options.dasherizedModuleName);
        },
        __test__() {
          return 'transforms-test';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __path__() {
          return path.join('unit', 'transforms');
        },
      };
    }
  },
});
