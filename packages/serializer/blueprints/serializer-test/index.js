const path = require('path');

const testInfo = require('ember-cli-test-info');
const useTestFrameworkDetector = require('@ember-data/private-build-infra/src/utilities/test-framework-detector');
const modulePrefixForProject = require('@ember-data/private-build-infra/src/utilities/module-prefix-for-project');

module.exports = useTestFrameworkDetector({
  description: 'Generates a serializer unit test.',

  root: __dirname,

  fileMapTokens(options) {
    return {
      __root__() {
        return 'tests';
      },
      __path__() {
        return path.join('unit', 'serializers');
      },
    };
  },

  locals(options) {
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Serializer'),
      modulePrefix: modulePrefixForProject(options.project),
    };
  },
});
