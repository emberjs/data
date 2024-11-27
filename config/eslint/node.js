// @ts-check
import nodePlugin from 'eslint-plugin-n';
import globals from 'globals';

/** @returns {import('eslint').Linter.FlatConfig} */
export function cjs(config) {
  const result = {
    files: [
      'addon-main.cjs',
      'addon-main.js',
      'babel.config.cjs',
      'config/ember-try.cjs',
      'config/ember-try.js',
      'config/environment.js',
      'config/targets.js',
      'ember-cli-build.cjs',
      'ember-cli-build.js',
      'eslint.config.cjs',
      'rollup.config.cjs',
      'rollup.config.js',
      'testem.cjs',
      'testem.js',
    ],
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  const finalConfig = Object.assign({}, nodePlugin.configs['flat/recommended-script'], result);
  finalConfig.linterOptions = {
    reportUnusedDisableDirectives: 'error',
  };
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

  finalConfig.rules = Object.assign(
    {},
    finalConfig.rules,
    {
      'n/no-missing-import': [
        'error',
        {
          // this rule has a bug where if a package has never been published
          // is generates a false report that its imports are missing
          // it also has a bug where it doesn't properly follow exports in package.json
          allowModules: ['@warp-drive/build-config', '@warp-drive/diagnostic'],
        },
      ],
    },
    config?.rules ?? {}
  );

  return finalConfig;
}

/** @returns {import('eslint').Linter.FlatConfig} */
export function esm(config) {
  const result = {
    files: [
      'addon-main.mjs',
      'babel.config.mjs',
      'diagnostic.js',
      'diagnostic.mjs',
      'eslint.config.mjs',
      'vite.config.mjs',
      'holodeck.js',
      'holodeck.mjs',
      'rollup.config.mjs',
      'testem.mjs',
    ],
  };

  if (config?.files) {
    result.files.push(...config.files);
  }

  const finalConfig = Object.assign({}, nodePlugin.configs['flat/recommended-module'], result);
  finalConfig.linterOptions = {
    reportUnusedDisableDirectives: 'error',
  };
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

  finalConfig.rules = Object.assign(
    {},
    finalConfig.rules,
    {
      'n/no-missing-import': [
        'error',
        {
          // this rule has a bug where if a package has never been published
          // is generates a false report that its imports are missing
          allowModules: ['@warp-drive/build-config', '@warp-drive/diagnostic'],
        },
      ],
    },
    config?.rules ?? {}
  );

  return finalConfig;
}
