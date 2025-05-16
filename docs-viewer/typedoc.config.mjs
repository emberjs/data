import { OptionDefaults } from 'typedoc';

/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPointStrategy: 'packages',
  docsRoot: './docs.warp-drive.io',
  entryPoints: [
    // '../packages/*'
    '../packages/active-record',
    '../packages/adapter',
    '../packages/build-config',
    '../packages/core-types',
    // Won't work until we figure out how
    // to get typedoc to work with glint
    // '../packages/ember',
    '../packages/experiments',
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
  ],
  entryFileName: 'index',
  packageOptions: {
    entryFileName: 'index',
    readme: 'none',
    excludeInternal: true,
    // inheritNone: true,
    useCodeBlocks: true,
    hidePageTitle: true,
    blockTags: [...OptionDefaults.blockTags, '@until', '@since', '@id'],
    modifierTags: [...OptionDefaults.modifierTags, '@required', '@optional', '@recommended', '@legacy', '@polaris'],
  },
  plugin: [
    import.meta.resolve('typedoc-plugin-markdown').slice(7),
    import.meta.resolve('typedoc-vitepress-theme').slice(7),
    import.meta.resolve('typedoc-plugin-no-inherit').slice(7),
  ],
  out: './docs.warp-drive.io/api',
  sidebar: {
    pretty: true,
  },
  readme: 'none',
  tsconfig: '../tsconfig.json',
  excludeInternal: true,
  useCodeBlocks: true,
  hidePageTitle: true,
  // typeAliasPropertiesFormat: 'htmlTable',
  // inheritNone: true,
};

export default config;
