const path = require('path');

const testInfo = require('ember-cli-test-info');
const { dasherize } = require('ember-cli-string-utils');

const ModelBlueprint = require('../model');

module.exports = {
  description: 'Generates an EmberData Model unit test',
  supportsAddon() { return false; },

  root: __dirname,

  fileMapTokens() {
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
    const modulePrefix = dasherize(options.project.config().modulePrefix);
    return {
      ...result,
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Model'),
      modulePrefix,
    };
  },

  filesPath() {
    return path.join(__dirname, 'qunit-files')
  }
};

