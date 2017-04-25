var path = require('path');

function removeImports() {
  var importDeclarationsToRemove;
  var filteredImports;

  return {
    name: 'remove-filtered-imports',
    visitor: {
      Program: {
        enter: function(_, state) {
          filteredImports = state.opts instanceof Array ? state.opts : (state.opts ? [state.opts] : []);
          importDeclarationsToRemove = [];
        },
        exit: function() {
          importDeclarationsToRemove.forEach(function(declaration) {
            declaration.remove();
          });

          importDeclarationsToRemove = undefined;
        }
      },

      ImportDeclaration: function(path) {
        var name = path.node.source.value;

        if (filteredImports.indexOf(name) !== -1) {
          importDeclarationsToRemove.push(path);
        }
      }

    }
  };
}

removeImports.baseDir = function() {
  return __dirname;
};

module.exports = removeImports;
