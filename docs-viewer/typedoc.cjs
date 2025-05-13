/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPointStrategy: 'packages',
  docsRoot: './docs.warp-drive.io',
  entryPoints: [
    // '../packages/*'
    '../packages/core-types',
  ],
  packageOptions: {},
  plugin: [require.resolve('typedoc-plugin-markdown'), require.resolve('typedoc-vitepress-theme')],
  out: './docs.warp-drive.io/api',
  sidebar: {
    pretty: true,
  },
  readme: 'none',
};

module.exports = config;
