const testInfo = require('ember-cli-test-info');
const useTestFrameworkDetector = require('@ember-data/-build-infra/src/utilities/test-framework-detector');
const isModuleUnificationProject = require('@ember-data/-build-infra/src/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates an ember-data adapter unit test',

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
          return 'adapter-test';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __path__() {
          return path.join('unit', 'adapters');
        },
      };
    }
  },

  locals(options) {
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Adapter'),
    };
  },
});
