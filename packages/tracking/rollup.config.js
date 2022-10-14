import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import fs from 'node:fs';
import path from 'node:path';
import * as url from 'node:url';
import walkSync from 'walk-sync';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

const importAvailable = ['services/**/*.{js,ts}', 'modifiers/**/*.{js,ts}'];
const globallyAvailable = ['components/**/*.{js,ts}', 'helpers/**/*.{js,ts}'];

function pathExists(filePath) {
  try {
    const fullPath = path.resolve(path.join(__dirname, 'src', filePath));
    fs.statSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

function isTemplateOnly(hbsPath) {
  const jsPath = hbsPath.replace(/\.hbs$/, '.js');
  const tsPath = hbsPath.replace(/\.hbs$/, '.ts');

  return !(pathExists(jsPath) || pathExists(tsPath));
}

function normalizeFileExt(fileName) {
  return fileName.replace(/\.hbs$/, '.js');
}

const templateOnlyComponent =
  `import templateOnly from '@ember/component/template-only';\n` +
  `export default templateOnly();\n`;

function templateOnlyPlugin(args) {
  const generated = new Set();

  return {
    name: 'template-only-component-plugin',

    resolveId(source) {
      const niceId = source.replace(__dirname, '');
      if (generated.has(niceId)) {
        return {
          id: source,
        };
      }
      return null;
    },

    load(id) {
      const niceId = id.replace(__dirname, '');
      if (generated.has(niceId)) {
        return {
          id,
          code: templateOnlyComponent,
        };
      }
      return null;
    },
    buildStart() {
      const matches = walkSync(args.srcDir, {
        globs: [...args.include],
      });

      for (const name of matches) {
        if (name.endsWith('.hbs') && isTemplateOnly(name)) {
          const fileName = normalizeFileExt(name);
          const id = path.join(args.srcDir, fileName);
          generated.add(id);
          this.emitFile({
            type: 'chunk',
            id,
            fileName,
          });
        }
      }
    },
  };
}

export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  output: addon.output(),

  external: [],

  plugins: [
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints([...globallyAvailable, ...importAvailable]),

    // These are the modules that should get reexported into the traditional
    // "app" tree. Things in here should also be in publicEntrypoints above, but
    // not everything in publicEntrypoints necessarily needs to go here.
    addon.appReexports(globallyAvailable),

    babel({
      extensions: ['.js', '.ts'],
      babelHelpers: 'runtime', // we should consider "external",
    }),

    // Follow the V2 Addon rules about dependencies. Your code can import from
    // `dependencies` and `peerDependencies` as well as standard Ember-provided
    // package names.
    addon.dependencies(),

    // ensure that template-only components are properly integrated
    // this exists because of https://github.com/embroider-build/embroider/issues/1121
    templateOnlyPlugin({ include: ['components/**/*.hbs'], srcDir: 'src' }),

    // Ensure that standalone .hbs files are properly integrated as Javascript.
    addon.hbs(),

    // addons are allowed to contain imports of .css files, which we want rollup
    // to leave alone and keep in the published output.
    addon.keepAssets(['**/*.css']),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
