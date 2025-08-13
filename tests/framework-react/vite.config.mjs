import { babel } from '@rollup/plugin-babel';
import { defineConfig } from 'vite';

export default defineConfig({
  // esbuild attempts to transform tsx/ts files to js files in a non-spec
  // compliant way, so we cannot use it.
  // unfortunately this also means we have to enable all the JSX/TSX stuff ourselves
  esbuild: false,
  logLevel: 'error',
  reportCompressedSize: false,
  plugins: [
    babel({
      configFile: './babel.config.mjs',
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
    }),
  ],
});
