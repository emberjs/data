const path = require('path');

function external(manual = []) {
  const pkg = require(path.join(process.cwd(), './package.json'));
  const deps = Object.keys(pkg.dependencies || {});
  const peers = Object.keys(pkg.peerDependencies || {});
  const all = new Set([...deps, ...peers, ...manual]);

  const result = [...all.keys()];
  // console.log({ externals: result });
  return result;
}

module.exports = {
  external,
};
