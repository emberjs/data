import { extensions, ember } from '@embroider/vite';
import { defineConfig } from 'vite';

import { maybeBabel } from '@warp-drive/internal-config/vite/babel.js';

export default defineConfig({
  // Extension pages are served from the extension's own origin, so every asset
  // URL must be relative to the page rather than the origin root.
  base: './',
  build: {
    // Left readable while the extension is only loaded unpacked. @embroider/vite's
    // `ember()` plugin would otherwise default to terser.
    minify: false,
  },
  plugins: [ember(), maybeBabel({ extensions })],
});
