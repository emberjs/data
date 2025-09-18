export interface CodemodConfig {
  name: string;
  description: string;
}

// FIXME: Move this info to src/index.ts
export const codemods: CodemodConfig[] = [
  {
    name: 'legacy-compat-builders',
    description:
      'Updates legacy store methods to use `store.request` and `@ember-data/legacy-compat/builders` instead.',
  },
  {
    name: 'migrate-to-schema',
    description: 'Migrates both EmberData models and mixins to WarpDrive schemas in batch.',
  },
];
