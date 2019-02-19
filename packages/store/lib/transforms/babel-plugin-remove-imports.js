'use strict';

module.exports = function PluginRemoveFilteredImports() {
  let importDeclarationsToRemove;
  let filteredImports;
  let filteredImportNames;

  return {
    name: 'remove-filtered-imports',
    visitor: {
      Program: {
        enter(_, state) {
          filteredImports = state.opts || {};
          filteredImportNames = Object.keys(filteredImports);
          importDeclarationsToRemove = [];
        },
        exit() {
          importDeclarationsToRemove.forEach(declaration => declaration.remove());

          importDeclarationsToRemove = undefined;
        },
      },

      ImportDeclaration(path) {
        let name = path.node.source.value;

        if (filteredImportNames.indexOf(name) !== -1) {
          if (filteredImports[name] === true || filteredImports[name] === '*') {
            importDeclarationsToRemove.push(path);
          } else {
            let removables = [];
            let imports = path.node.specifiers;
            const hasSpecifiers = imports.length > 0;

            for (let i = 0; i < imports.length; i++) {
              if (imports[i].type === 'ImportNamespaceSpecifier') {
                continue;
              }

              let specifier = imports[i].imported;

              if (filteredImports[name].indexOf(specifier.name) !== -1) {
                removables.push(imports[i]);
              }
            }

            if (hasSpecifiers && removables.length === imports.length) {
              importDeclarationsToRemove.push(path);
            } else {
              for (let i = 0; i < removables.length; i++) {
                let index = imports.indexOf(removables[i]);
                imports.splice(index, 1);
              }
            }
          }
        }
      },
    },
  };
};
