function rules(config) {
  return Object.assign(
    {
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': false }],
      'no-loop-func': 'off',
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-throw-literal': 'off',
      '@typescript-eslint/no-throw-literal': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'off',
    },
    config?.rules ?? {}
  );
}

function plugins() {
  return ['@typescript-eslint'];
}

function extend() {
  return ['plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/recommended-type-checked'];
}

function settings() {
  return {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      project: 'tsconfig.json',
    },
  };
}

function defaults(config) {
  return {
    files: config?.files || ['**/*.ts'],
    ...settings(),
    rules: rules(config),
    plugins: plugins(),
    extends: extend(),
  };
}

module.exports = {
  rules,
  settings,
  defaults,
  plugins,
  extend,
};
