const path = require('path');

const testInfo = require('ember-cli-test-info');
const { dasherize } = require('ember-cli-string-utils');

module.exports = {
  description: 'Generates an EmberData adapter unit test',
  supportsAddon() { return false; },

  root: __dirname,

  fileMapTokens() {
    return {
      __root__() {
        return 'tests';
      },
      __path__() {
        return path.join('unit', 'adapters');
      },
    };
  },

  locals(options) {
    const modulePrefix = dasherize(options.project.config().modulePrefix);
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Adapter'),
      modulePrefix,
    };
  },

  filesPath() {
    return path.join(__dirname, 'qunit-files')
  }
};

