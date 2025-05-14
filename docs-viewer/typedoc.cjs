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
  ],
  entryFileName: 'index',
  packageOptions: {
    entryFileName: 'index',
    readme: 'none',
    excludeInternal: true,
    // inheritNone: true,
  },
  plugin: [
    require.resolve('typedoc-plugin-markdown'),
    require.resolve('typedoc-vitepress-theme'),
    require.resolve('typedoc-plugin-no-inherit'),
  ],
  out: './docs.warp-drive.io/api',
  sidebar: {
    pretty: true,
  },
  readme: 'none',
  tsconfig: '../tsconfig.json',
  excludeInternal: true,
  useCodeBlocks: true,
  // inheritNone: true,
};

module.exports = config;
