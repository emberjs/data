import { OptionDefaults } from 'typedoc';

/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPointStrategy: 'packages',
  docsRoot: './tmp',
  entryPoints: [
    // '../packages/*'
    '../packages/active-record',
    '../packages/adapter',
    '../warp-drive-packages/build-config',
    '../packages/core-types',
    // Won't work until we figure out how
    // to get typedoc to work with glint
    // '../packages/ember',
    '../packages/graph',
    '../packages/json-api',
    '../packages/legacy-compat',
    '../packages/model',
    '../packages/request',
    '../packages/request-utils',
    '../packages/rest',
    '../packages/schema-record',
    '../packages/serializer',
    '../packages/store',
    '../packages/tracking',
    '../warp-drive-packages/core',
    '../warp-drive-packages/legacy',
    '../warp-drive-packages/utilities',
    // Won't work until we figure out how
    // to get typedoc to work with glint
    // '../warp-drive-packages/ember',
    '../warp-drive-packages/json-api',
    '../warp-drive-packages/experiments',
  ],
  entryFileName: 'index',
  packageOptions: {
    entryFileName: 'index',
    readme: 'none',
    excludeInternal: true,
    // inheritNone: true,
    useCodeBlocks: true,
    hidePageTitle: false,
    groupReferencesByType: true,
    groupOrder: [
      '*', // we put unknown specialized groups first
      'Classes',
      'Methods',
      'Properties',
      'Accessors',
      'Constants',
      'Variables',
      'Utility Functions',
      'Functions',
      'Interfaces',
      'Type Aliases',
      'Modules',
    ],
    blockTags: [...OptionDefaults.blockTags, '@until', '@since', '@id'],
    modifierTags: [...OptionDefaults.modifierTags, '@required', '@optional', '@recommended', '@legacy', '@polaris'],
  },
  plugin: [
    import.meta.resolve('typedoc-plugin-markdown').slice(7),
    import.meta.resolve('typedoc-vitepress-theme').slice(7),
    import.meta.resolve('typedoc-plugin-no-inherit').slice(7),
    import.meta.resolve('typedoc-plugin-mdn-links').slice(7),
  ],
  out: './tmp/api',
  sidebar: {
    pretty: true,
  },
  readme: 'none',
  tsconfig: '../tsconfig.json',
  excludeInternal: true,
  useCodeBlocks: true,
  hidePageTitle: false,
  // typeAliasPropertiesFormat: 'htmlTable',
  // inheritNone: true,
};

export default config;
