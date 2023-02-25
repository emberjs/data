const { ImportUtil } = require('babel-import-util');

function parentIsUnary(node) {
  if (node.parent.type === 'UnaryExpression' && node.parent.operator === '!') {
    return true;
  }
  return false;
}

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'existence-checks',
    visitor: {
      ImportDeclaration(path, state) {
        const replacements = state.opts.flags;
        const importPath = path.node.source.value;

        if (importPath === state.opts.source) {
          const specifiers = path.get('specifiers');
          specifiers.forEach((specifier) => {
            let name = specifier.node.imported.name;
            if (replacements[name]) {
              let localBindingName = specifier.node.local.name;
              let binding = specifier.scope.getBinding(localBindingName);
              binding.referencePaths.forEach((p) => {
                let negateStatement = false;
                let node = p;
                if (parentIsUnary(p)) {
                  negateStatement = true;
                  node = p.parentPath;
                }

                const exp = t.callExpression(state.importer.import(p, '@embroider/macros', 'dependencySatisfies'), [
                  t.stringLiteral(replacements[name]),
                  t.stringLiteral('*'),
                ]);

                node.replaceWith(
                  t.callExpression(state.importer.import(p, '@embroider/macros', 'macroCondition'), [
                    negateStatement ? t.unaryExpression('!', exp) : exp,
                  ])
                );
              });
              specifier.scope.removeOwnBinding(localBindingName);
              specifier.remove();
            }
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
