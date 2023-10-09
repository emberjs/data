/* eslint-disable node/no-unpublished-require */
const TestemConfig = require('@ember-data/unpublished-test-infra/src/testem/testem');

const Config = Object.assign({}, TestemConfig);
Config.framework = 'custom';

module.exports = Config;
