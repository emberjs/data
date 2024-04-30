import path from 'path';
import fs from 'fs';

function loadConfig() {
  const configPath = path.join(process.cwd(), './package.json');
  const pkg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return pkg;
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

    if (id.startsWith('@ember/') || id.startsWith('@ember-data/') || id.startsWith('@warp-drive/')) {
      throw new Error(`Unexpected import: ${id}`);
    }

    return false;
  };
}
