import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "WarpDrive",
  description: "Boldly go where no App has gone before",

  // just until we have the guides and docs in a better state
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: './logos/NCC-1701-a-gold.svg' }],
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

  themeConfig: {
    siteTitle: false,
    logo: {
      dark: '/logos/warp-drive-logo-gold.svg',
      light: '/logos/warp-drive-logo-dark.svg',
      alt: 'WarpDrive'
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guides', link: '/guides' },
      { text: 'API', link: '/api' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Guides', link: '/guides' },
          { text: 'API', link: '/api' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/emberjs/data' },
      { icon: 'discord', link: 'https://discord.gg/zT3asNS' },
      { icon: 'bluesky', link: 'https://bsky.app/profile/warp-drive.io' }
    ]
  }
})
