const macros = require('@ember-data/private-build-infra/src/v2-babel-build-pack');

module.exports = {
  plugins: [
    ...macros,
    ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
  ],
};
