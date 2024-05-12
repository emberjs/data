import noop from 'ember-eslint-parser/noop';
import emberEslintParser from 'ember-eslint-parser';
import * as ts from './typescript.js';

export function browser(config) {
  config.files = config.files ?? ['**/*.{gts,gjs}'];
  const base = ts.browser(config);

  const parser = Object.assign(
    {
      meta: {
        name: 'ember-eslint-parser',
        version: '*',
      },
    },
    emberEslintParser
  );

  base.languageOptions.parser = parser;
  base.processor = 'ember/noop';
  base.plugins = Object.assign({}, base.plugins, {
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

  return base;
}
