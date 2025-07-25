const alwaysUseRequestContent = require('./rules/always-use-request-content.js');

module.exports = {
  name: 'ember-template-lint-plugin-warp-drive',
  rules: {
    'always-use-request-content': alwaysUseRequestContent,
  },
  configurations: {
    recommended: {
      rules: {
        'always-use-request-content': true,
      },
    },
  },
};