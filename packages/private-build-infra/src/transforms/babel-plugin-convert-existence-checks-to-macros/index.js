function setupState(t, path, state) {
  let allAddedImports = {};
  let importedModules = {};
  state.ensureImport = (exportName, moduleName) => {
    let addedImports = (allAddedImports[moduleName] = allAddedImports[moduleName] || {});
    if (addedImports[exportName]) return addedImports[exportName];

    let importDeclarations = path.get('body').filter((n) => n.type === 'ImportDeclaration');

    let preexistingImportDeclaration = importDeclarations.find((n) => n.get('source').get('value').node === moduleName);

    if (preexistingImportDeclaration) {
      let importSpecifier = preexistingImportDeclaration.get('specifiers').find(({ node }) => {
        return exportName === 'default' ? t.isImportDefaultSpecifier(node) : node.imported.name === exportName;
      });
      if (importSpecifier) {
        addedImports[exportName] = importSpecifier.node.local;
      } else {
        const newImportSpecifier = t.importSpecifier(t.identifier(exportName), t.identifier(exportName));
        preexistingImportDeclaration.node.specifiers.push(newImportSpecifier);
        addedImports[exportName] = newImportSpecifier;
      }
    }

    if (!addedImports[exportName]) {
      addedImports[exportName] = exportName;
      let newImport = t.importDeclaration(
        [t.importSpecifier(t.identifier(exportName), t.identifier(exportName))],
        t.stringLiteral(moduleName)
      );
      path.unshiftContainer('body', newImport);
    }

    if (!importedModules[moduleName]) {
      importedModules[moduleName] = [];
    }
    importedModules[moduleName].push(addedImports[exportName]);
    return addedImports[exportName];
  };
}

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'ast-transform', // not required
    visitor: {
      ImportSpecifier(path, state) {
        if (path.node.imported.name === 'HAS_RECORD_DATA_PACKAGE') {
          const parent = path.findParent((path) => path.isImportDeclaration);
          if (parent.node.specifiers.length > 1) {
            path.remove();
          } else {
            parent.remove();
          }
          state.ensureImport('macroCondition', '@embroider/macros');
          state.ensureImport('moduleExists', '@embroider/macros');
        }
      },
      Identifier(path) {
        if (path.node.name === 'HAS_RECORD_DATA_PACKAGE') {
          if (t.isIfStatement(path.parent)) {
            path.replaceWith(
              t.callExpression(t.identifier('macroCondition'), [
                t.callExpression(t.identifier('moduleExists'), [t.stringLiteral('@ember-data/record-data')]),
              ])
            );
          }
        }
      },
      Program(path, state) {
        setupState(t, path, state);
      },
    },
  };
};
