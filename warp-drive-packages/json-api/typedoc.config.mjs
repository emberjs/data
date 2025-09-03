import { entryPoints } from './vite.config.mjs';

/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPoints: entryPoints.filter((entry) => !entry.includes('-private')),
  out: 'doc',
  readme: 'src/index.md',
  categoryOrder: [
    'Cache Management',
    'Cache Forking',
    'SSR Support',
    'Resource Lifecycle',
    'Resource Data',
    'Resource State',
    '*',
  ],
};

export default config;
