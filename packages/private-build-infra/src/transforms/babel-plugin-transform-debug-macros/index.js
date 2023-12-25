const { ImportUtil } = require('babel-import-util');

const Utils = new Set(['assert']);

function buildAssertFn(t) {
  return t.functionDeclaration(
    t.identifier('assert'),
    [t.identifier('desc'), t.identifier('test')],
    t.blockStatement([
      t.ifStatement(
        t.unaryExpression('!', t.identifier('test')),
        t.blockStatement([
          t.throwStatement(
            t.newExpression(t.identifier('Error'), [
              t.identifier('desc')
            ])
          ),
        ])
      ),
    ])
  );
}

function findInsertionPoint(path) {
  const program = path.parent;
  let lastNode = null;
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') {
      return lastNode;
    }
    lastNode = node;
  }
  return lastNode;
}

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'ast-transform', // not required
    visitor: {
      ImportDeclaration(path, state) {
        const importPath = path.node.source.value;

        if (importPath === '@ember-data/macros') {
          const specifiers = path.get('specifiers');
          const insertLocation = findInsertionPoint(path);

          specifiers.forEach((specifier) => {
            const name = specifier.node.imported.name;
            if (!Utils.has(name)) {
              throw new Error(`Unexpected import '${name}' imported from '@ember-data/macros'`);
            }

            if (name === 'assert') {
              const fn = buildAssertFn(t);
              const index = path.parent.body.indexOf(insertLocation) + 1;
              path.parent.body.splice(index, 0, fn);
              specifier.remove();
            }
          });

          if (specifiers.length === 0) path.remove();
        }
      },

      Program(path, state) {
        state.importer = new ImportUtil(t, path);
      },
    },
  };
};
