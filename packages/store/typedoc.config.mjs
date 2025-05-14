import { entryPoints } from './vite.config.mjs';

/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPoints: entryPoints.filter((entry) => !entry.includes('-private')),
  out: 'doc',
  readme: 'none',
};

export default config;
