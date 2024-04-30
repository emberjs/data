import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'addon',
});

function external(manual = []) {
  const pkg = require(path.join(process.cwd(), './package.json'));
  const deps = Object.keys(pkg.dependencies || {});
  const peers = Object.keys(pkg.peerDependencies || {});
  const all = new Set([...deps, ...peers, ...manual]);

  // console.log({ externals: result });
  return function (id) {
    if (all.has(id)) {
      return true;
    }

    for (const dep of deps) {
      if (id.startsWith(dep + '/')) {
        return true;
      }
    }

    for (const dep of peers) {
      if (id.startsWith(dep + '/')) {
        return true;
      }
    }

    if (id.startsWith('@ember/') || id.startsWith('@ember-data/') || id.startsWith('@warp-drive/')) {
      throw new Error(`Unexpected import: ${id}`);
    }

    return false;
  };
}

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: external(['@ember/debug']),

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', '-private.js']),

    nodeResolve({ extensions: ['.ts'] }),
    babel({
      extensions: ['.ts'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
