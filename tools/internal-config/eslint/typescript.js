// @ts-check
import * as js from './browser.js';
import * as imports from './imports.js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import noop from 'ember-eslint-parser/noop';
import emberEslintParser from 'ember-eslint-parser';

/** @return {import('eslint').Linter.FlatConfig} */
function mergeTsConfigs(configArray) {
  const merged = {
    languageOptions: {},
    rules: {},
  };
  for (const config of configArray) {
    merged.languageOptions = config.languageOptions ? config.languageOptions : merged.languageOptions;
    merged.plugins = config.plugins ? config.plugins : merged.plugins;
    merged.rules = config.rules ? Object.assign(merged.rules, config.rules) : merged.rules;
  }

  return merged;
}

export function rules(config = {}) {
  const ourRules = {
    '@typescript-eslint/no-base-to-string': 'off',
    '@typescript-eslint/no-invalid-void-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/unified-signatures': 'off',
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/no-dynamic-delete': 'off',
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
    '@typescript-eslint/only-throw-error': 'error',
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
  };

  const finalized = {};

  if (config.recommended || typeof config.recommended !== 'boolean') {
    Object.assign(finalized, mergeTsConfigs(tseslint.configs.recommended).rules);
  }
  if (config.typeChecked || typeof config.recommended !== 'boolean') {
    Object.assign(finalized, mergeTsConfigs(tseslint.configs.recommendedTypeChecked).rules);
  }
  if (config.strict || typeof config.recommended !== 'boolean') {
    Object.assign(finalized, mergeTsConfigs(tseslint.configs.strict).rules);
  }

  Object.assign(finalized, ourRules, config?.rules ?? {});

  return finalized;
}

export function parser(enableGlint = false) {
  if (enableGlint) {
    return Object.assign(
      {
        meta: {
          name: 'ember-eslint-parser',
          version: '*',
        },
      },
      emberEslintParser
    );
  }
  const merged = mergeTsConfigs(tseslint.configs.recommended);
  // @ts-expect-error
  return merged.languageOptions.parser;
}

export function plugins() {
  return {
    '@typescript-eslint': tseslint.plugin,
  };
}

export function constructFileGlobs(srcDirs, files) {
  const globs = [];

  for (const dir of srcDirs) {
    const hasSlash = dir.endsWith('/');
    for (const file of files) {
      const needsSlash = !hasSlash && !file.startsWith('/');
      globs.push(`${dir}${needsSlash ? '/' : ''}${file}`);
    }
  }

  return globs;
}

/** @return {import('eslint').Linter.FlatConfig} */
export function browser(config) {
  config.files = config.files ?? ['**/*.ts'];
  /** @type {String[]} */
  const files = Array.isArray(config.srcDirs) ? constructFileGlobs(config.srcDirs, config.files) : config.files;

  const lintconfig = {
    files,
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parser: parser(config.enableGlint),
      parserOptions: {
        project: './tsconfig.json',
        projectService: false,
        tsconfigRootDir: config.dirname,
        extraFileExtensions: ['.gts', '.gjs'],
      },
      /** @type {2022} */
      ecmaVersion: 2022,
      /** @type {'module'} */
      sourceType: 'module',
      globals: Object.assign({}, globals.browser, config.globals),
    },
    rules: Object.assign({}, js.rules(config), rules(config)),
    // @ts-expect-error
    plugins: Object.assign({}, imports.plugins(), plugins()),
  };

  if (config.enableGlint) {
    lintconfig.processor = 'ember/noop';
    lintconfig.plugins = Object.assign({}, lintconfig.plugins, {
      ember: {
        meta: {
          name: 'ember',
          version: '*',
        },
        processors: {
          noop,
        },
      },
    });
  }

  return lintconfig;
}

/** @return {import('eslint').Linter.FlatConfig} */
export function node(config) {
  config.files = config.files ?? ['**/*.ts'];
  /** @type {String[]} */
  const files = Array.isArray(config.srcDirs) ? constructFileGlobs(config.srcDirs, config.files) : config.files;

  return {
    files,
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parser: parser(),
      parserOptions: {
        project: './tsconfig.json',
        extraFileExtensions: ['.gts', '.gjs'],
      },
      /** @type {2022} */
      ecmaVersion: 2022,
      /** @type {'module'} */
      sourceType: 'module',
      globals: Object.assign({}, globals.node, config.globals),
    },
    rules: Object.assign({}, js.rules(config), rules(config)),
    // @ts-expect-error
    plugins: Object.assign({}, imports.plugins(), plugins()),
  };
}
