const extendFromApplicationEntity = require('@ember-data/-build-infra/src/utilities/extend-from-application-entity');
const isModuleUnificationProject = require('@ember-data/-build-infra/src/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');
const useEditionDetector = require('@ember-data/-build-infra/src/utilities/edition-detector');

module.exports = useEditionDetector({
  description: 'Generates an ember-data serializer.',

  availableOptions: [{ name: 'base-class', type: String }],

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
        __name__() {
          return 'serializer';
        },
      };
    }
  },

  locals(options) {
    return extendFromApplicationEntity('serializer', 'DS.JSONAPISerializer', options);
  },
});
