import { entryPoints } from './vite.config.mjs';

/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  entryPoints: entryPoints,
  out: 'doc',
};

export default config;
