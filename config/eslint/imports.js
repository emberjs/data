import SimpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import ImportPlugin from 'eslint-plugin-import';

// See https://github.com/lydell/eslint-plugin-simple-import-sort#custom-grouping
const ImportSortGroups = [
  // Side effect imports.
  [`^\u0000`],
  // Glimmer & Ember Dependencies
  [`^(@ember/|@glimmer|ember$)`],
  // Packages.
  // Things that start with a letter (or digit or underscore), or `@` followed by a letter.
  // But not our packages or packages starting with ember-
  // eslint-disable-next-line no-useless-escape
  [`^(?!@ember\-data)(?!warp\-drive)(?!ember-)(@?\\w)`],
  // Packages starting with ember-
  // eslint-disable-next-line no-useless-escape
  [`^ember\-`],
  // Our Packages.
  // Things that start with @ember-data
  // eslint-disable-next-line no-useless-escape
  [`^(@ember\-data|@warp\-drive)`],
  // Absolute imports and other imports such as Vue-style `@/foo`.
  // Anything that does not start with a dot.
  ['^[^.]'],
  // Relative imports.
  // Anything that starts with a dot.
  // eslint-disable-next-line no-useless-escape
  [`^\.`],
];

export function rules() {
  return {
    // Imports
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'simple-import-sort/imports': ['error', { groups: ImportSortGroups }],
  };
}

export function plugins() {
  return {
    'simple-import-sort': SimpleImportSortPlugin,
    import: ImportPlugin,
  };
}
