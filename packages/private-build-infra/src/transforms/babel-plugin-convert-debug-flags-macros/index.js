const { ImportUtil } = require('babel-import-util');

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'ast-transform', // not required
    visitor: {
      ImportDeclaration(path, state) {
        const importPath = path.node.source.value;

        if (importPath === state.opts.source) {
          const specifiers = path.get('specifiers');
          specifiers.forEach((specifier) => {
            let name = specifier.node.imported.name;
            let localBindingName = specifier.node.local.name;
            let binding = specifier.scope.getBinding(localBindingName);
            binding.referencePaths.forEach((p) => {
              p.replaceWith(
                t.callExpression(state.importer.import(p, '@embroider/macros', 'macroCondition'), [
                  t.propertyAccessExpression(
                    t.callExpression(state.importer.import(p, '@embroider/macros', 'getOwnConfig')),
                    t.identifier(name)
                  ),
                ])
              );
            });
            specifier.scope.removeOwnBinding(localBindingName);
            specifier.remove();
          });
        }
        if (path.get('specifiers').length === 0) {
          path.remove();
        }
      },

      Program(path, state) {
        state.importer = new ImportUtil(t, path);
      },
    },
  };
};
