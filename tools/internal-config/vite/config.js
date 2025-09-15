import { babel } from '@rollup/plugin-babel';
import { external, explicitExternals, entryPoints } from '../rollup/external.js';
import { defineConfig } from 'vite';
// import dts from 'vite-plugin-dts';
import { FixModuleOutputPlugin } from './fix-module-output-plugin.js';
// import { CompileTypesPlugin } from './compile-types-plugin.js';
// vite.config.ts
import UnpluginIsolatedDecl from 'unplugin-isolated-decl/vite';
import { MoveTypesToDestination } from './move-types.js';

export function createConfig(options, resolve) {
  options.srcDir = options.srcDir ?? './src';
  options.fixModule = options.fixModule ?? true;
  options.rollupTypes = options.rollupTypes ?? false;
  options.compileTypes = options.compileTypes ?? true;

  return defineConfig({
    esbuild: options.esbuild ?? false,
    logLevel: 'error',
    reportCompressedSize: false,
    build: {
      outDir: options.outDir ?? 'dist',
      emptyOutDir: options.emptyOutDir ?? true,
      target: options.target ?? ['esnext', 'firefox121'],
      minify: false,
      sourceMap: true,
      lib: {
        entry: entryPoints(options.entryPoints, resolve, options),
        formats: options.format ? [options.format] : ['es'],
      },
      rollupOptions: {
        external: options.explicitExternalsOnly ? explicitExternals(options.externals) : external(options.externals),
        plugins: options.rollup?.plugins,
        output: {
          hoistTransitiveImports: false,
          preserveModules: options.rollup?.preserveModules ?? false,
          format: options.format ? options.format : 'es',
          entryFileNames: options.format === 'cjs' ? '[name].cjs' : '[name].js',
        },
      },
    },
    plugins: [
      options.compileTypes
        ? UnpluginIsolatedDecl({
            include: `${options.srcDir}/**/*.{ts,gts,tsx}`,
            extraOutdir: 'declarations',
            sourcemap: true,
            transformOptions: {
              stripInternal: true,
              sourcemap: true,
            },
          })
        : null,
      options.skipDefaultPlugins
        ? false
        : babel(
            options.babelConfigFile
              ? {
                  configFile: options.babelConfigFile,
                  babelHelpers: 'bundled',
                  extensions: ['.js', '.ts', '.gjs', '.gts', '.jsx', '.tsx'],
                }
              : {
                  babelHelpers: 'bundled',
                  extensions: ['.js', '.ts', '.gjs', '.gts', '.jsx', '.tsx'],
                }
          ),
      options.compileTypes ? MoveTypesToDestination(options, resolve) : null,
      // options.compileTypes === true && options.rollupTypes === true
      //   ? dts({
      //       rollupTypes: true,
      //       outDir: 'unstable-preview-types',
      //       logLevel: 'silent',
      //       afterDiagnostic: (diagnostic) => {},
      //     })
      //   : undefined,
      !options.skipDefaultPlugins && options.fixModule ? FixModuleOutputPlugin : undefined,
      // options.compileTypes === true && options.rollupTypes === false ? CompileTypesPlugin(options.useGlint) : undefined,
    ]
      .concat(options.plugins || [])
      .filter(Boolean),
  });
}
