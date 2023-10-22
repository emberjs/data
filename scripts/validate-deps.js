const fs = require('fs');
const path = require('path');
const root = process.cwd();

const pkgs = new Map();
const otherPkgs = new Set([
  'ember-inflector',
  '@ember/string'
]);
const files = new Map();
const currentVersion = require(path.join(root, 'package.json')).version;
const peer_exceptions = {
  '@ember-data/active-record': {
    '@ember-data/store': true
  },
  '@ember-data/rest': {
    '@ember-data/store': true
  },
}

function isPeerException(pkg, dep) {
  return Boolean(peer_exceptions[pkg] && peer_exceptions[pkg][dep]);
}

function getRequiredPeers(dep, version = '*', seen = new Map()) {
  const pkg = pkgs.get(dep);
  if (!pkg) {
    if (otherPkgs.has(dep)) {
      seen.set(dep, version);
    }

    // TODO - handle otherPkgs that aren't these
    return seen;
  }
  seen.set(dep, version);

  if (pkg.peerDependencies) {
    Object.entries(pkg.peerDependencies).forEach(([peer, version]) => {
      getRequiredPeers(peer, version, seen);
    });
  }

  return seen;
}

fs.readdirSync(path.join(root, 'packages')).forEach((dirName) => {
  const pkg = require(path.join(root, 'packages', dirName, 'package.json'));
  pkgs.set(pkg.name, pkg);
  files.set(pkg.name, {
    path: path.join(root, 'packages', dirName, 'package.json'),
    pkg
  });
});

fs.readdirSync(path.join(root, 'tests')).forEach((dirName) => {
  const pkg = require(path.join(root, 'tests', dirName, 'package.json'));
  pkgs.set(pkg.name, pkg);
  files.set(pkg.name, {
    path: path.join(root, 'tests', dirName, 'package.json'),
    pkg
  });
});

pkgs.forEach((pkg) => {
  let edited = false;
  if (pkg.version !== currentVersion) {
    throw new Error(`Version mismatch for ${pkg.name} - expected ${currentVersion} but found ${pkg.version}`);
  }

  Object.entries(pkg.dependencies ?? {}).forEach(([dep, version]) => {
    if (pkgs.has(dep)) {
      const depVersion = pkgs.get(dep).version;
      const wsVersion = `workspace:${depVersion}`;

      if (version !== wsVersion) {
        console.log(`Dependency mismatch for ${pkg.name} -> ${dep} - expected ${wsVersion} but found ${version}`);
        edited = true;
        pkg.dependencies[dep] = wsVersion;
      }
    }

    if (pkgs.has(dep) || otherPkgs.has(dep)) {
      if (!pkg.dependenciesMeta) {
        console.log(`Missing dependenciesMeta for ${pkg.name}`);
        edited = true;
        pkg.dependenciesMeta = {};
      }
      if (!pkg.dependenciesMeta[dep]) {
        console.log(`Missing dependenciesMeta for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.dependenciesMeta[dep] = {};
      }
      if (!pkg.dependenciesMeta[dep].injected) {
        console.log(`Missing injected: true in dependenciesMeta for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.dependenciesMeta[dep].injected = true;
      }
    }
  });

  Object.entries(pkg.peerDependencies ?? {}).forEach(([dep, version]) => {
    if (pkgs.has(dep)) {
      const depVersion = pkgs.get(dep).version;
      const wsVersion = `workspace:${depVersion}`;

      if (version !== wsVersion && !isPeerException(pkg.name, dep)) {
        console.log(`Peer Dependency mismatch for ${pkg.name} -> ${dep} - expected ${wsVersion} but found ${version}`);
        edited = true;
        pkg.peerDependencies[dep] = wsVersion;
      }

      const requiredPeers = getRequiredPeers(dep);
      requiredPeers.delete(dep);
      requiredPeers.forEach((version, peer) => {
        if (!pkg.devDependencies || !pkg.devDependencies[peer]) {
          console.log(`\tMissing transient peer dependency ${peer}@${version} for ${pkg.name} -> ${dep}`);
          edited = true;
          if (!pkg.devDependencies) {
            pkg.devDependencies = {};
          }
          pkg.devDependencies[peer] = pkgs.has(peer) ? `workspace:${pkgs.get(peer).version}` : version;
        }
      });
    }

    if (pkgs.has(dep) || otherPkgs.has(dep)) {
      if (!pkg.devDependencies) {
        console.log(`Missing devDependencies for ${pkg.name}`);
        edited = true;
        pkg.devDependencies = {};
      }
      if (!pkg.devDependencies[dep]) {
        console.log(`Missing devDependencies for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.devDependencies[dep] = otherPkgs.has(dep) ? version : `workspace:${pkgs.get(dep).version}`;
      }
      if (!pkg.devDependenciesMeta) {
        console.log(`Missing devDependenciesMeta for ${pkg.name}`);
        edited = true;
        pkg.devDependenciesMeta = {};
      }
      if (!pkg.devDependenciesMeta[dep]) {
        console.log(`Missing devDependenciesMeta for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.devDependenciesMeta[dep] = {};
      }
      if (!pkg.devDependenciesMeta[dep].injected) {
        console.log(`Missing injected: true in devDependenciesMeta for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.devDependenciesMeta[dep].injected = true;
      }
    }
  });

  const deps = Object.entries(pkg.devDependencies ?? {});

  for (let i = 0; i < deps.length; i++) {
    const [dep, version] = deps[i];

    if (pkgs.has(dep)) {
      const depVersion = pkgs.get(dep).version;
      const wsVersion = `workspace:${depVersion}`;

      if (version !== wsVersion && !isPeerException(pkg.name, dep)) {
        console.log(`Dev Dependency mismatch for ${pkg.name} -> ${dep} - expected ${wsVersion} but found ${version}`);
        edited = true;
        pkg.devDependencies[dep] = wsVersion;
      }

      const requiredPeers = getRequiredPeers(dep);
      requiredPeers.delete(dep);
      requiredPeers.forEach((version, peer) => {
        if (!pkg.devDependencies[peer]) {
          console.log(`\tMissing transient peer dependency ${peer}@${version} for ${pkg.name} -> ${dep}`);
          edited = true;
          if (!pkg.devDependencies) {
            pkg.devDependencies = {};
          }
          pkg.devDependencies[peer] = pkgs.has(peer) ? `workspace:${pkgs.get(peer).version}` : version;
          deps.push([peer, version]);
        }
      });
    }

    if (pkgs.has(dep) || otherPkgs.has(dep)) {
      if (!pkg.devDependenciesMeta) {
        console.log(`Missing devDependenciesMeta for ${pkg.name}`);
        edited = true;
        pkg.devDependenciesMeta = {};
      }
      if (!pkg.devDependenciesMeta[dep]) {
        console.log(`Missing devDependenciesMeta for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.devDependenciesMeta[dep] = {};
      }
      if (!pkg.devDependenciesMeta[dep].injected) {
        console.log(`Missing injected: true in devDependenciesMeta for ${pkg.name} -> ${dep}`);
        edited = true;
        pkg.devDependenciesMeta[dep].injected = true;
      }
    }

  }

  if (edited) {
    fs.writeFileSync(files.get(pkg.name).path, JSON.stringify(pkg, null, 2) + '\n');
  }
});
