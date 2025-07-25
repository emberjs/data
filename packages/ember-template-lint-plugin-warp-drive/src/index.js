import alwaysUseRequestContent from './rules/always-use-request-content.js';

export default {
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