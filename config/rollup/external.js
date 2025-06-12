import path from 'path';
import fs from 'fs';
import { globSync } from '../utils/glob.js';

function loadConfig() {
  const configPath = path.join(process.cwd(), './package.json');
  const pkg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return pkg;
}

export function entryPoints(globs, resolve, options) {
  const files = [];

  // expand all globs
  globs.forEach((glob) => {
    glob.includes('*') || glob.includes('{') ? files.push(...globSync(glob)) : files.push(glob);
  });

  const srcDir = resolve(options.srcDir.startsWith('.') ? options.srcDir : './' + options.srcDir).slice(7) + '/';

  // resolve all files to full paths
  const allFiles = files.map((v) => {
    if (!v.startsWith('.')) {
      v = './' + v;
    }

    const file = resolve(v);
    if (file.startsWith('file://')) {
      return file.slice(7);
    }
    return file;
  });

  const fileMap = {};
  allFiles.forEach((file) => {
    let name;
    if (options.flatten) {
      // extract the file name sans directory and extension
      name = path.basename(file, path.extname(file));
    } else {
      // extract the file name sans srcDir directory and extension
      name = file.replace(srcDir, '');
      name = name.slice(0, name.length - path.extname(name).length);
    }
    fileMap[name] = file;
  });
  // console.log({ srcDir, fileMap });
  return fileMap;
}

export function external(manual = []) {
  const pkg = loadConfig();
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

    if (id.startsWith('@warp-drive/build-config/') && pkg.devDependencies?.['@warp-drive/build-config']) {
      return true;
    }

    if (id.startsWith('@embroider/macros') && pkg.devDependencies?.['@embroider/macros']) {
      return true;
    }

    if (id.startsWith('expect-type') && pkg.devDependencies?.['expect-type']) {
      return true;
    }

    if (id.startsWith('@ember/') || id.startsWith('@ember-data/') || id.startsWith('@warp-drive/')) {
      throw new Error(`Unexpected import: '${id}' is neither a dependency nor a peerDependency.`);
    }

    return false;
  };
}

export function explicitExternals(manual = []) {
  return function (id) {
    if (manual.includes(id)) {
      return true;
    }
    return false;
  }
}
