const path = require('path');

const testInfo = require('ember-cli-test-info');
const useTestFrameworkDetector = require('@ember-data/private-build-infra/src/utilities/test-framework-detector');
const modulePrefixForProject = require('@ember-data/private-build-infra/src/utilities/module-prefix-for-project');

module.exports = useTestFrameworkDetector({
  description: 'Generates a transform unit test.',

  root: __dirname,

  fileMapTokens(options) {
    return {
      __root__() {
        return 'tests';
      },
      __path__() {
        return path.join('unit', 'transforms');
      },
    };
  },

  locals(options) {
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Transform'),
      modulePrefix: modulePrefixForProject(options.project),
    };
  },
});
