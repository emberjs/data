function rules(config) {
  return Object.assign(
    {
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false,
        },
      ],
      'no-loop-func': 'off',
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-throw-literal': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/no-throw-literal': 'error',
      // Many failures for these; they seem intentional so I don't want to just auto-fix:
      // '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      // '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      // Auto-fix changes the types in some of these cases, which didn't seem safe:
      // '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-return-this-type': 'error',
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
