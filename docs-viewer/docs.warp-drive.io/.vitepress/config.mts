import { defineConfig } from 'vitepress';
import { getGuidesStructure } from '../../src/site-utils.ts';
// @ts-expect-error json file import
import typedocSidebar from '../api/typedoc-sidebar.json';

type SidebarItem = { text: string };

const OLD_PACKAGES = [
  '@ember-data/adapter',
  '@ember-data/active-record',
  '@ember-data/debug',
  '@ember-data/legacy-compat',
  '@ember-data/model',
  '@ember-data/json-api',
  '@ember-data/store',
  '@ember-data/graph',
  '@ember-data/request',
  '@ember-data/request-utils',
  '@ember-data/rest',
  '@ember-data/serializer',
  '@ember-data/tracking',
  '@warp-drive/core-types',
  '@warp-drive/build-config',
  '@warp-drive/schema-record',
];

function splitApiDocsSidebar(sidebar: SidebarItem[]) {
  const oldPackages: SidebarItem[] = [];
  const newPackages: SidebarItem[] = [];

  for (const item of sidebar) {
    if (OLD_PACKAGES.includes(item.text)) {
      oldPackages.push(item);
    } else {
      newPackages.push(item);
    }
  }

  return {
    oldPackages,
    newPackages,
  };
}

const TypeDocSidebar = splitApiDocsSidebar(typedocSidebar);

import llmstxt from 'vitepress-plugin-llms';
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons';

const GuidesStructure = await getGuidesStructure(false);

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'WarpDrive',
  description: 'Boldly go where no App has gone before',

  markdown: {
    config(md) {
      md.use(groupIconMdPlugin);
    },
  },
  vite: {
    plugins: [llmstxt(), groupIconVitePlugin()],
  },

  // just until we have the guides and docs in a better state
  ignoreDeadLinks: true,

  // this won't work properly until we don't need to sync the guides
  // from the repo root into the docs-viewer
  // lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/logos/NCC-1701-a-gold.png', type: 'image/png' }],
    ['link', { rel: 'icon', href: '/logos/NCC-1701-a-gold.svg', type: 'image/svg+xml' }],

    [
      'meta',
      {
        name: 'keywords',
        content:
          'data-framework fetch typescript typed REST data-loading apps GraphQL JSON:API jsonapi json reactivity signals cross-framework MPA SPA',
      },
    ],
    [
      'meta',
      {
        name: 'description',
        content:
          'WarpDrive is a lightweight data library for web apps — universal, typed, reactive, and ready to scale.',
      },
    ],
    [
      'meta',
      {
        itemprop: 'description',
        content:
          'WarpDrive is a lightweight data library for web apps — universal, typed, reactive, and ready to scale.',
      },
    ],

    ['meta', { property: 'og:title', content: 'WarpDrive' }],
    ['meta', { property: 'og:site_name', content: 'warp-drive.io' }],
    ['meta', { property: 'og:type', content: 'website' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'WarpDrive is a lightweight data library for web apps — universal, typed, reactive, and ready to scale.',
      },
    ],
    ['meta', { property: 'og:url', content: 'https://warp-drive.io' }],
    ['meta', { property: 'og:image', content: '/logos/github-header.png' }],
    // ['meta', { property: 'og:image', content: '/logos/social1.png' }],
    // ['meta', { property: 'og:image', content: '/logos/social2.png' }],
    // [
    //   'link',
    //   { rel: 'preconnect', href: 'https://fonts.googleapis.com' }
    // ],
    // [
    //   'link',
    //   { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
    // ],
    // [
    //   'link',
    //   { href: 'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&amp;display=swap', rel: 'stylesheet' }
    // ]
  ],

  // github pages supports cleanURLs
  cleanUrls: true,
  // @ts-expect-error
  base: process.env.BASE || '/',

  // we want to use rewrites but can't https://github.com/vuejs/vitepress/issues/4364
  // rewrites: GuidesStructure.rewritten,

  sitemap: {
    // @ts-expect-error
    hostname: process.env.HOSTNAME || 'https://canary.warp-drive.io',
  },

  themeConfig: {
    siteTitle: false,
    logo: {
      dark: '/logos/warp-drive-logo-gold.svg',
      light: '/logos/warp-drive-logo-dark.svg',
      alt: 'WarpDrive',
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guides', link: '/guide' },
      { text: 'API Docs', link: '/api' },
      { text: 'Contributing', link: '/guide/contributing/become-a-contributor' },
    ],

    sidebar: [
      ...GuidesStructure.paths,
      {
        text: 'API Docs',
        collapsed: true,
        // link: '/api/',
        items: TypeDocSidebar.newPackages,
      },
      {
        text: 'Legacy Packages',
        collapsed: true,
        // link: '/api/',
        items: TypeDocSidebar.oldPackages,
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/emberjs/data' },
      { icon: 'discord', link: 'https://discord.gg/zT3asNS' },
      { icon: 'bluesky', link: 'https://bsky.app/profile/warp-drive.io' },
    ],

    editLink: {
      pattern: 'https://github.com/emberjs/data/edit/main/:path',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: 2,
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright &copy; 2025 Ember.js and Contributors`,
    },
  },
});
