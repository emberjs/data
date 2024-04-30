export function defaults(config = {}) {
  return {
    files: config.files || ['tests/**/*-test.{js,ts}'],
    plugins: ['mocha'],
    extends: ['plugin:mocha/recommended'],
    env: {
      node: true,
    },
    rules: {
      // We use setup to set up beforeEach hooks, etc, which should be OK
      'mocha/no-setup-in-describe': 'off',
    },
  };
}
