const isModuleUnificationProject = require('@ember-data/-build-infra/src/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');
const useEditionDetector = require('@ember-data/-build-infra/src/utilities/edition-detector');

module.exports = useEditionDetector({
  description: 'Generates an ember-data value transform.',

  root: __dirname,

  fileMapTokens(options) {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__() {
          return 'src';
        },
        __path__(options) {
          return path.join('data', 'transforms');
        },
        __name__() {
          return options.dasherizedModuleName;
        },
      };
    }
  },
});
