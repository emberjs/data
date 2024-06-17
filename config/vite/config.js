import { babel } from '@rollup/plugin-babel';
import { external, entryPoints } from '../rollup/external.js';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { FixModuleOutputPlugin } from './fix-module-output-plugin.js';
// import { CompileTypesPlugin } from './compile-types-plugin.js';

export function createConfig(options, resolve) {
  options.srcDir = options.srcDir ?? './src';
  options.fixModule = options.fixModule ?? true;
  options.rollupTypes = options.rollupTypes ?? false;
  options.compileTypes = options.compileTypes ?? true;

  return defineConfig({
    esbuild: false,
    logLevel: 'error',
    reportCompressedSize: false,
    build: {
      outDir: 'dist',
      emptyOutDir: options.emptyOutDir ?? true,
      target: options.target ?? ['esnext', 'firefox121'],
      minify: false,
      sourcemap: true,
      lib: {
        entry: entryPoints(options.entryPoints, resolve, options),
        formats: options.format ? [options.format] : ['es'],
      },
      rollupOptions: {
        external: external(options.externals),
        plugins: options.rollup?.plugins,
        output: {
          preserveModules: options.rollup?.preserveModules ?? false,
        },
      },
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts', '.gjs', '.gts'],
      }),
      options.compileTypes === true && options.rollupTypes === true
        ? dts({
            rollupTypes: true,
            outDir: 'unstable-preview-types',
            logLevel: 'silent',
            afterDiagnostic: (diagnostic) => {},
          })
        : undefined,
      options.fixModule ? FixModuleOutputPlugin : undefined,
      // options.compileTypes === true && options.rollupTypes === false ? CompileTypesPlugin(options.useGlint) : undefined,
      ...(options.plugins ?? []),
    ]
      .concat(options.plugins || [])
      .filter(Boolean),
  });
}
