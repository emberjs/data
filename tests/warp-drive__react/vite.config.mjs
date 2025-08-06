import { babel } from '@rollup/plugin-babel';
import { defineConfig } from 'vite';

export default defineConfig({
  logLevel: 'error',
  reportCompressedSize: false,
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
    }),
  ],
});
