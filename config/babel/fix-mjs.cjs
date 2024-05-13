module.exports = function () {
  const addonLocation = process.env.ADDON_LOCATION;
  const pkgPath = addonLocation + '/package.json';
  const pkg = require(pkgPath);
  const isV1Addon = !pkg['ember-addon'] || pkg['ember-addon'].version === 1;

  function replaceExt(node) {
    if (node.value.endsWith('.mjs')) {
      node.value = node.value.replace('.mjs', '.js');
    }
    if (isV1Addon) {
      if (node.value.endsWith('.js')) {
        node.value = node.value.replace('.js', '');
      }
    }
  }

  return {
    name: '@warp-drive/internal-config/fix-mjs',
    visitor: {
      Program(path) {
        path.node.body.forEach((node) => {
          if (node.type === 'ImportDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) {
            replaceExt(node.source);
          }
        });
      },
      CallExpression(path) {
        if (path.node.callee.type === 'Import') {
          replaceExt(path.node.arguments[0]);
        }
      },
    },
  };
};
