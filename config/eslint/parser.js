import babelParser from '@babel/eslint-parser';

function resolve(name) {
  const fullPath = import.meta.resolve(name);
  if (fullPath.startsWith('file://')) {
    return fullPath.slice(7);
  }
}

export function languageOptions() {
  return {
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
        // eslint-disable-next-line n/no-unpublished-require
        plugins: [[resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
      },
    },
  };
}

export function defaults() {
  return {
    languageOptions: languageOptions(),
  };
}
