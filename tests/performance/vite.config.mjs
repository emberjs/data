import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import { compression } from 'vite-plugin-compression2';
// import { analyzer } from 'vite-bundle-analyzer';

import zlib from 'zlib';

export default defineConfig({
  plugins: [
    classicEmberSupport(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
    // analyzer(),
    compression({
      algorithm: 'brotliCompress',
      compressionOptions: {
        params: {
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
          // brotli currently defaults to 11 but lets be explicit
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        },
      },
      deleteOriginalAssets: true,
    }),
  ],
  server: {
    proxy: {
      '/fixtures': `http://localhost:${process.env.FIXTURE_API_PORT || '9999'}`,
    },
  },
  mode: 'production',
  build: {
    minify: 'terser',
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@ember-data/model')) return 'warp-drive-legacy';
          if (id.includes('@ember-data/legacy-compat')) return 'warp-drive-legacy';
          if (id.includes('@ember-data')) return 'warp-drive-legacy';
          if (id.includes('@warp-drive/legacy')) return 'warp-drive-legacy';
          if (id.includes('@warp-drive')) return 'warp-drive';
          if (id.includes('@ember')) return 'ember';
          if (id.includes('ember-source')) return 'ember';
          if (id.includes('@glimmer')) return 'ember';
          if (id.includes('node_modules')) return 'vendor';
          return null;
        },
      },
    },
    terserOptions: {
      compress: {
        ecma: 2024,
        passes: 6, // slow, but worth it
        negate_iife: false,
        sequences: 30,
        defaults: true,
        drop_debugger: false,
        arguments: false,
        keep_fargs: false,
        toplevel: false,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_proto: true,
        unsafe_undefined: true,
        inline: 5,
        reduce_funcs: false,
      },
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
        module: true,
      },
      format: { beautify: true },
      toplevel: false,
      sourceMap: false,
      ecma: 2024,
    },
  },
});
