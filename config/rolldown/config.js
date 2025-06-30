import { external, explicitExternals, entryPoints } from '../rollup/external.js';

import UnpluginIsolatedDecl from 'unplugin-isolated-decl/rolldown';

export function createConfig(options, resolve) {
  options.srcDir = options.srcDir ?? './src';

  return {
    input: entryPoints(options.entryPoints, resolve, options),
    external: options.explicitExternalsOnly ? explicitExternals(options.externals) : external(options.externals),
    plugins: [
      options.compileTypes ? UnpluginIsolatedDecl({}) : null,
      babel(
        options.babelConfigFile
          ? {
              configFile: options.babelConfigFile,
              babelHelpers: 'bundled',
              extensions: ['.js', '.ts', '.gjs', '.gts'],
            }
          : {
              babelHelpers: 'bundled',
              extensions: ['.js', '.ts', '.gjs', '.gts'],
            }
      ),
    ]
      .concat(options.plugins || [])
      .filter(Boolean),

    output: {
      hoistTransitiveImports: false,
      preserveModules: options.rollup?.preserveModules ?? false,
      format: options.format ? options.format : 'es',
      entryFileNames: options.format === 'cjs' ? '[name].cjs' : '[name].js',
    },
  };
}
