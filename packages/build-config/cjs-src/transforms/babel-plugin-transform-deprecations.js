import { ImportUtil } from 'babel-import-util';

function parentIsUnary(node) {
  if (node.parent.type === 'UnaryExpression' && node.parent.operator === '!') {
    return true;
  }
  return false;
}

export default function (babel) {
  const { types: t } = babel;

  return {
    name: 'deprecation-flags',
    visitor: {
      ImportDeclaration(path, state) {
        const importPath = path.node.source.value;

        if (importPath === state.opts.source) {
          const specifiers = path.get('specifiers');
          specifiers.forEach((specifier) => {
            let name = specifier.node.imported.name;
            if (!(name in state.opts.flags)) {
              throw new Error(`Unexpected flag ${name} imported from ${state.opts.source}`);
            }
            let localBindingName = specifier.node.local.name;
            let binding = specifier.scope.getBinding(localBindingName);
            binding.referencePaths.forEach((p, other) => {
              let negateStatement = false;
              let node = p;
              if (parentIsUnary(p)) {
                negateStatement = true;
                node = p.parentPath;
              }
              const comments =
                node.node.leadingComments ??
                (node.parent.type === 'ConditionalExpression' && node.parent.leadingComments) ??
                [];
              let shouldInlineConfigValue = false;
              if (comments?.length) {
                const lastComment = comments.at(-1);
                if (lastComment.value.trim() === 'inline-macro-config') {
                  shouldInlineConfigValue = true;
                }
              }

              let getConfig = t.memberExpression(
                t.memberExpression(
                  t.memberExpression(
                    t.callExpression(state.importer.import(p, '@embroider/macros', 'getGlobalConfig'), []),
                    t.identifier('WarpDrive')
                  ),
                  t.identifier('deprecations')
                ),
                t.identifier(name)
              );

              const configExp = negateStatement ? t.unaryExpression('!', getConfig) : getConfig;
              const replaceExp = shouldInlineConfigValue
                ? // if (DEPRECATE_FOO)
                  // =>
                  // if (getGlobalConfig('WarpDrive').deprecations.FOO)
                  configExp
                : // if (DEPRECATE_FOO)
                  // =>
                  // if (macroCondition(getGlobalConfig('WarpDrive').deprecations.FOO))
                  t.callExpression(state.importer.import(p, '@embroider/macros', 'macroCondition'), [configExp]);
              node.replaceWith(replaceExp);
            });
            specifier.scope.removeOwnBinding(localBindingName);
            specifier.remove();
          });
          if (path.get('specifiers').length === 0) {
            path.remove();
          }
        }
      },

      Program(path, state) {
        state.importer = new ImportUtil(t, path);
      },
    },
  };
}
