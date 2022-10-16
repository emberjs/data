module.exports = function () {
  return {
    name: '@ember-data/v1-addon-shim/transform-ext',
    visitor: {
      Program(path) {
        path.node.body.forEach((node) => {
          if (node.type === 'ImportDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) {
            if (node.source.value.endsWith('.js')) {
              node.source.value = node.source.value.replace('.js', '');
            }
          }
        });
      },
    },
  };
};
