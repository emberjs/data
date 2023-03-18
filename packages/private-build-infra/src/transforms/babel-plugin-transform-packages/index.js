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
    name: 'ast-transform', // not required
    visitor: {
      ImportDeclaration(path, state) {
        const importPath = path.node.source.value;

        if (importPath === state.opts.source) {
          const specifiers = path.get('specifiers');
          specifiers.forEach((specifier) => {
            let name = specifier.node.imported.name;
            if (!(name in state.opts.flags)) {
              return;
            }
            let localBindingName = specifier.node.local.name;
            let binding = specifier.scope.getBinding(localBindingName);
            binding.referencePaths.forEach((p) => {
              let negateStatement = false;
              let node = p;
              if (parentIsUnary(p)) {
                negateStatement = true;
                node = p.parentPath;
              }
              let getConfig = t.memberExpression(
                t.memberExpression(
                  t.callExpression(state.importer.import(p, '@embroider/macros', 'getOwnConfig'), []),
                  t.identifier('packages')
                ),
                t.identifier(name)
              );
              node.replaceWith(
                // if (LOG_FOO)
                // =>
                // if (macroCondition(getOwnConfig().debug.LOG_FOO))
                t.callExpression(state.importer.import(p, '@embroider/macros', 'macroCondition'), [
                  negateStatement ? t.unaryExpression('!', getConfig) : getConfig,
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
