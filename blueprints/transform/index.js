const isModuleUnificationProject = require('../../lib/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');

module.exports = {
  description: 'Generates an ember-data value transform.',

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
          return 'transform-test';
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
};
