const path = require('path');

let isRoot = false;
try {
  const dir = process.cwd();
  const pkg = require(path.join(dir, './package.json'));
  if (pkg.name === 'root') {
    isRoot = true;
  }
} catch (e) {
  console.log(e);
}

const prettierPath = path.join(process.cwd(), isRoot ? './.prettierrc.js' : '../../.prettierrc.js');
const prettierConfig = require(prettierPath);

function rules() {
  return {
    eqeqeq: 'error',
    'new-cap': ['error', { capIsNew: false }],
    'no-caller': 'error',
    'no-cond-assign': ['error', 'except-parens'],
    'no-console': 'error', // no longer recommended in eslint v6, this restores it
    'no-eq-null': 'error',
    'no-eval': 'error',
    'no-unused-vars': ['error', { args: 'none' }],

    // Too many false positives
    // See https://github.com/eslint/eslint/issues/11899 and similar
    'require-atomic-updates': 'off',

    'prefer-rest-params': 'off',
    'prefer-const': 'error',

    'prettier/prettier': [
      'error',
      prettierConfig,
      {
        usePrettierrc: false,
      },
    ],
  };
}

function plugins() {
  return ['prettier'];
}

function extend() {
  return ['eslint:recommended', 'plugin:prettier/recommended'];
}

function settings() {
  return {
    globals: {},
    env: {
      browser: true,
      node: false,
      es2022: true,
    },
  };
}

module.exports = {
  rules,
  plugins,
  extend,
  settings,
};
