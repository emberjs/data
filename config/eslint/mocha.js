import * as node from './node.js';
import mochaPlugin from 'eslint-plugin-mocha';

export function cjs(config = {}) {
  config.files = config.files || ['tests/**/*.{js,ts}'];
  const base = node.cjs(config);
  const recommended = mochaPlugin.configs.flat.recommended;

  base.plugins = Object.assign(base.plugins, recommended.plugins);
  base.rules = Object.assign(base.rules, recommended.rules, {
    // We use setup to set up beforeEach hooks, etc, which should be OK
    'mocha/no-setup-in-describe': 'off',
  });

  return base;
}
