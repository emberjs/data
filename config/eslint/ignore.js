const RULES = [
  // # unconventional js
  'blueprints/*',
  '!./tests/blueprints/*',
  'vendor/*',

  // # Declaration files
  '**/*.d.ts',

  // # compiled output
  'dist/*',
  'dist-*/*',
  'addon/*',
  'tmp/*',
  'tmp*/*',
  'DEBUG/*',
  'DEBUG*/*',
  '.git/*',
  '.broccoli-cache/*',
  'unstable-preview-types/*',

  // # Special Cases
  'docs/*',
  'coverage/*',
  'node_modules/*',
  '.node_modules.ember-try/*',
  'package.json.ember-try',
];

export function ignoreRules() {
  return RULES.slice();
}

export function globalIgnores(additionalIgnores) {
  return {
    ignores: ignoreRules().concat(additionalIgnores ?? []),
  };
}
