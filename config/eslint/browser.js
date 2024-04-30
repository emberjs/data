// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
// @ts-expect-error
import babelParser from '@babel/eslint-parser';
import * as imports from './imports.js';
import * as isolation from './isolation.js';

// function resolve(name) {
//   const fullPath = import.meta.resolve(name);
//   if (fullPath.startsWith('file://')) {
//     return fullPath.slice(7);
//   }
// }

export function languageOptions(opts = {}) {
  const options = {
    parser: babelParser,
    /** @type {2022} */
    ecmaVersion: 2022,
    /** @type {'module'} */
    sourceType: 'module',
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        babelrc: false,
        configFile: false,
        plugins: [
          'classProperties',
          'classPrivateProperties',
          'classStaticBlock',
          opts.enableTypescript ? ['typescript', {}] : false,
          opts.enableDecorators ? ['decorators', {}] : false,
        ].filter(Boolean),
        // \eslint-disable-next-line n/no-unpublished-require
        // plugins: [[resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
      },
    },
    globals: Object.assign({}, globals.nodeBuiltin),
  };

  return options;
}

export function rules(config = {}) {
  const ourRules = {
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
  };

  return Object.assign(
    {},
    js.configs.recommended.rules,
    prettier.rules,
    imports.rules(),
    isolation.rules(config),
    ourRules
  );
}

function constructFileGlobs(srcDirs, files) {
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

/** @returns {import('eslint').Linter.FlatConfig} */
export function browser(config = {}) {
  config.enableDecorators = typeof config.enableDecorators === 'boolean' ? config.enableDecorators : true;
  const baseFiles = Array.isArray(config.files) ? config.files : ['**/*.{js,gjs}'];
  const files = Array.isArray(config.srcDirs) ? constructFileGlobs(config.srcDirs, baseFiles) : baseFiles;

  const finalized = {
    files,
    languageOptions: languageOptions(config),
    rules: rules(config),
    plugins: imports.plugins(),
  };

  return finalized;
}
