const preferTypeOnlyImport = require('./rules/prefer-static-type-only-import-syntax');

module.exports = {
  rules: {
    'prefer-static-type-only-import-syntax': preferTypeOnlyImport,
  },
};
