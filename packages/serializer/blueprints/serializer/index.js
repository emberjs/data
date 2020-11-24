const extendFromApplicationEntity = require('@ember-data/private-build-infra/src/utilities/extend-from-application-entity');
const useEditionDetector = require('@ember-data/private-build-infra/src/utilities/edition-detector');

module.exports = useEditionDetector({
  description: 'Generates an ember-data serializer.',

  availableOptions: [{ name: 'base-class', type: String }],

  root: __dirname,

  locals(options) {
    return extendFromApplicationEntity('serializer', 'JSONAPISerializer', options);
  },
});
