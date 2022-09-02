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
      ImportDeclaration(path, state) {
        console.log(state.filename);
        const replacements = state.opts.flags;
        const importPath = path.node.source.value;

        if (importPath === state.opts.source) {
          const specifiers = path.get('specifiers');
          specifiers.forEach((specifier) => {
            let name = specifier.node.imported.name;
            if (replacements[name]) {
              let localBindingName = specifier.node.local.name;
              let binding = specifier.scope.getBinding(localBindingName);
              // console.log('binding: ', binding);
              binding.referencePaths.forEach((p) => {
                p.replaceWith(
                  t.callExpression(t.identifier('macroCondition'), [
                    t.callExpression(t.identifier('moduleExists'), [t.stringLiteral(replacements[name])]),
                  ])
                );
              });
              specifier.scope.removeOwnBinding(localBindingName);
              state.ensureImport('@embroider/macros', 'macroCondition');
              state.ensureImport('@embroider/macros', 'moduleExists');
            }
          });
        }
        if (path.get('specifiers').length === 0) {
          path.remove();
        }
      },

      Program(path, state) {
        setupState(t, path, state);
      },
    },
  };
};
