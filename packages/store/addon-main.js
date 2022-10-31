const buildMain = require('@ember-data/private-build-infra/src/v1-addon-main');

const pkg = require('./package.json');

module.exports = buildMain(pkg);
