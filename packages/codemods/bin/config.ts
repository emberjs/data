export interface CodemodConfig {
  name: string;
  description: string;
}

export const codemods: CodemodConfig[] = [
  {
    name: 'legacy-compat-builders',
    description:
      'Updates legacy store methods to use `store.request` and `@ember-data/legacy-compat/builders` instead.',
  },
];
