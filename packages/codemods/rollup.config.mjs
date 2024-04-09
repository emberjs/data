import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const config = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/bundle.js', // CommonJS output for Node.js
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts'],
    }),
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      exclude: 'node_modules/**',
      presets: ['@babel/preset-typescript'],
    }),
  ],
};

export default config;
