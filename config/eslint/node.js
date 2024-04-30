// @ts-check
import nodePlugin from 'eslint-plugin-n';
import globals from 'globals';

/** @returns {import('eslint').Linter.FlatConfig} */
export function cjs(config) {
  const result = {
    files: [
      './eslint.config.cjs',
      './.eslintrc.cjs',
      './babel.config.cjs',
      './ember-cli-build.cjs',
      './ember-cli-build.js',
      './rollup.config.cjs',
      './rollup.config.js',
      './testem.js',
      './testem.cjs',
      './config/ember-try.cjs',
      './config/ember-try.js',
      './addon-main.cjs',
      './addon-main.js',
      './config/environment.js',
      './config/targets.js',
    ],
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  const finalConfig = Object.assign({}, nodePlugin.configs['flat/recommended-script'], result);
  finalConfig.languageOptions = Object.assign({}, finalConfig.languageOptions, {
    /** @type {'commonjs'} */
    sourceType: 'commonjs',
    /** @type {2022} */
    ecmaVersion: 2022,
    globals: Object.assign({}, globals.node, finalConfig.languageOptions.globals, config?.globals ?? {}),
  });
  finalConfig.languageOptions.parserOptions = Object.assign({}, finalConfig.languageOptions.parserOptions, {
    ...(config?.parserOptions ?? {}),
  });

  finalConfig.rules = Object.assign({}, finalConfig.rules, config?.rules ?? {});

  return finalConfig;
}

/** @returns {import('eslint').Linter.FlatConfig} */
export function esm(config) {
  const result = {
    files: [
      './diagnostic.js',
      './diagnostic.mjs',
      './holodeck.mjs',
      './holodeck.js',
      './babel.config.mjs',
      './rollup.config.mjs',
      './testem.mjs',
      './eslint.config.mjs',
      './addon-main.mjs',
    ],
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  const finalConfig = Object.assign({}, nodePlugin.configs['flat/recommended-module'], result);
  finalConfig.languageOptions = Object.assign({}, finalConfig.languageOptions, {
    /** @type {'module'} */
    sourceType: 'module',
    /** @type {2022} */
    ecmaVersion: 2022,
    globals: Object.assign({}, globals.nodeBuiltin, finalConfig.languageOptions.globals, config?.globals ?? {}),
  });
  finalConfig.languageOptions.parserOptions = Object.assign({}, finalConfig.languageOptions.parserOptions, {
    ...(config?.parserOptions ?? {}),
  });

  finalConfig.rules = Object.assign({}, finalConfig.rules, config?.rules ?? {});

  return finalConfig;
}
