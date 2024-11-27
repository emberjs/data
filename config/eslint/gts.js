import * as ts from './typescript.js';

export function browser(config) {
  config.files = config.files ?? ['**/*.{gts,gjs}'];
  config.enableGlint = true;
  const base = ts.browser(config);

  return base;
}
