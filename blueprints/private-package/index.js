'use strict';
const dasherize = require('ember-cli-string-utils').dasherize;

module.exports = {
  description:
    'Generates a supporting package that is intended only to be consumed by our public packages',

  availableOptions: [],

  fileMapTokens(options) {
    return {
      __name__() {
        return `-${options.dasherizedModuleName}`;
      },
    };
  },

  locals(project) {
    const dasherizedModuleName = dasherize(project.entity.name);
    return {
      packageName: `@ember-data/-${dasherizedModuleName}`,
    };
  },
};
