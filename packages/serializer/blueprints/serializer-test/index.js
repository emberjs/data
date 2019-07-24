const testInfo = require('ember-cli-test-info');
const useTestFrameworkDetector = require('@ember-data/-build-infra/src/utilities/test-framework-detector');
const isModuleUnificationProject = require('@ember-data/-build-infra/src/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates a serializer unit test.',

  root: __dirname,

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
          return 'serializer-test';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __path__() {
          return path.join('unit', 'serializers');
        },
      };
    }
  },

  locals(options) {
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Serializer'),
    };
  },
});
