function readPackage(pkg, context) {
  if (pkg.name === 'typescript') {
    pkg.bin = { ...pkg.bin };
    delete pkg.bin['tsc'];
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
