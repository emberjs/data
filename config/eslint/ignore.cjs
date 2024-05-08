const RULES = [
  // # unconventional js
  'blueprints/',
  '!tests/blueprints/',
  'vendor',

  // # Declaration files
  '**/*.d.ts',

  // # compiled output
  'dist',
  'dist-*',
  'tmp',
  'DEBUG',
  'DEBUG*',
  'tmp*',
  '.git',
  '.broccoli-cache',
  'unstable-preview-types',

  // # Special Cases
  'docs',
  'coverage',
  'node_modules',
  '.node_modules.ember-try',
  'package.json.ember-try',
  'tests/__testfixtures__',
];

function ignoreRules(allowAddon) {
  const rules = allowAddon ? [] : ['addon'];

  return rules.concat(RULES);
}

module.exports = {
  ignoreRules,
};
