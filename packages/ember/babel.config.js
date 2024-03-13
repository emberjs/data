const macros = require('@ember-data/private-build-infra/src/v2-babel-build-pack');

module.exports = {
  plugins: [
    ...macros,
    ['@babel/plugin-transform-runtime', { loose: true }],
    ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
    ['@babel/plugin-proposal-decorators', { legacy: true, loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
  ],
};
