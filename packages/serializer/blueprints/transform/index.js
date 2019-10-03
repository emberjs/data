const useEditionDetector = require('@ember-data/-build-infra/src/utilities/edition-detector');

module.exports = useEditionDetector({
  description: 'Generates an ember-data value transform.',

  root: __dirname,
});
