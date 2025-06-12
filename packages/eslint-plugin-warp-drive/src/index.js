'use strict';

const requireIndex = require('requireindex');
const pkg = require('../package.json');

module.exports = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },
  rules: requireIndex(`${__dirname}/rules`),
};
