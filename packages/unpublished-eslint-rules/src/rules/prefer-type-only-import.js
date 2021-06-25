const collapseRanges = require('./utils/collapse-ranges');
const createParamStringForGenerics = require('./utils/create-param-string-for-generics');

const RULE_FAILURE_MESSAGE = `ES Import Declaration should be converted to Typescript type only import.`;

function identifierIsModuleScopeReference(identifier, scope) {
  // determine if this Identifier is declared in module scope
  // (vs. potentially a shadowed variable instance)
  for (let i = 0; i < scope.references.length; i++) {
    let ref = scope.references[i];
    if (ref.identifier === identifier) {
      if (ref.resolved.scope.type === 'module') {
        return true;
      }
    }
  }

  return false;
}

/*
 Checks if an identifier could potentially be the usage of something imported.
 This is useful for preventing the more expensive "scope check" on the identifier
 needed to confirm something is indeed the thing imported for cases where it is
 obvious that it could not be.
*/
function isMaybeUsage(identifier, imports) {
  if (imports[identifier.name] === undefined) {
    return false;
  }

  let type = identifier.parent.type;
  // weed out declarations or accessors that can't
  // possibly be a reference to an import
  if (
    type === 'ImportSpecifier' ||
    type === 'ImportDefaultSpecifier' ||
    type === 'TSTypeReference' ||
    type === 'TSClassImplements' ||
    type === 'TSInterfaceHeritage' ||
    type === 'TSQualifiedName' ||
    type === 'TSEmptyBodyFunctionExpression' ||
    type === 'TSPropertySignature' ||
    type === 'TSMethodSignature' ||
    type === 'TSTypeQuery' ||
    type === 'TSTypeAliasDeclaration' ||
    type === 'TSImportType' ||
    type === 'TSModuleDeclaration' ||
    (type === 'MemberExpression' && identifier.parent.property === identifier) ||
    (type === 'ClassDeclaration' && identifier.parent.id === identifier) ||
    (type === 'VariableDeclarator' && identifier.parent.id === identifier) ||
    (type === 'AssignmentPattern' && identifier.parent.left === identifier) ||
    type === 'FunctionDeclaration' ||
    type === 'FunctionExpression' ||
    (type === 'ClassProperty' && identifier.parent.key === identifier) ||
    (type === 'MethodDefinition' && identifier.parent.key === identifier) ||
    (type === 'AssignmentExpression' && identifier.parent.left === identifier) ||
    (type === 'Property' && identifier.parent.key === identifier && identifier.parent.value !== identifier) ||
    (type === 'Property' && identifier.parent.key === identifier && identifier.parent.parent.type === 'ObjectPattern')
  ) {
    return false;
  }
  /*
  if (
    type !== 'MemberExpression' &&
    type !== 'CallExpression' &&
    type !== 'IfStatement' &&
    type !== 'BinaryExpression' &&
    type !== 'ClassDeclaration' &&
    type !== 'VariableDeclaration' &&
    type !== 'AssignmentPattern' &&
    type !== 'ClassProperty' &&
    type !== 'NewExpression' &&
    type !== 'ConditionalExpression' &&
    type !== 'UnaryExpression' &&
    type !== 'LogicalExpression' &&
    type !== 'ExportDefaultDeclaration' &&
    type !== 'Property' &&
    type !== 'ExportSpecifier' &&
    type !== 'VariableDeclarator'
  ) {
    console.log(type, identifier.name);
  }
  */
  return true;
}

/*
  return specifiers for a declaration that were-not-used by any JS code
*/
function getSpecifiersNotUsedByJS(declaration, used) {
  return declaration.specifiers.filter((s) => used[s.local.name] !== true);
}

/*
 return specifiers that are type-only by the union of the the list of
 specifiers for a declaration that are not-used-by-JS and the list of
 specifiers that were-used-as-types
*/
function getTypeOnlySpecifiers(specifiers, usedTypes) {
  return specifiers.filter((s) => usedTypes[s.local.name]);
}

/*
  return whatever specifiers are not type-only specifiers for a declaration
  some of which may be unused as either types or in JS code
*/
function getRemainingSpecifiers(declaration, typeSpecifiers) {
  return declaration.specifiers.filter((s) => typeSpecifiers.indexOf(s) === -1);
}

/*
 Given a specifier intended for removal, get the full range we should remove.

 This adusts the range to account for removing both the specifier and
 when needed either the rest of the declaration or any associated syntax
 like extraneous brackets {} or commas and newlines.
*/
function getRangeToRemove(importSpecifierToRemove) {
  let declaration = importSpecifierToRemove.parent;
  let specifiers = declaration.specifiers;
  let defaultImport;

  if (specifiers.length && specifiers[0].type === 'ImportDefaultSpecifier') {
    defaultImport = specifiers[0];
    specifiers = [...specifiers];
    specifiers.shift();
  }

  if (importSpecifierToRemove === defaultImport) {
    if (specifiers.length === 0) {
      // remove the whole declaration + the newLine
      let [start, end] = declaration.range;
      return [start, end + 1];
    }
    // remove the defaultImport + a comma
    let [start, end] = importSpecifierToRemove.range;
    return [start, end + 1];
  }

  let index = specifiers.indexOf(importSpecifierToRemove);
  let isFirst = index === 0;
  let isOnly = specifiers.length === 1;
  let isLast = specifiers.length - 1 === index;

  let prevSibling = isOnly || isFirst ? null : specifiers[index - 1];
  let nextSibling = isOnly || isLast ? null : specifiers[index + 1];

  if (isOnly) {
    if (!defaultImport) {
      // console.log(`removing full declaration with removal of named import ${exportToRemove.local.name}`);
      // remove the whole declaration + the newLine
      let [start, end] = declaration.range;
      return [start, end + 1];
    }
    // remove the entirety of {}
    // console.log(`removing all named imports with removal of named import ${exportToRemove.local.name}`);
    let start = defaultImport.range[1];
    let end = importSpecifierToRemove.range[1] + 2;
    return [start, end];
  }

  if (isLast) {
    // console.log(`removing from preceding named import for ${exportToRemove.local.name}`);
    // remove starting with preceding `,`
    // which is possibly on a different line
    let start = prevSibling.range[1];
    let isMultiLine = prevSibling.loc.end.column !== importSpecifierToRemove.loc.end.column;
    let end = isMultiLine ? importSpecifierToRemove.range[1] + 1 : importSpecifierToRemove.range[1];
    return [start, end];
  }

  // remove starting with our imported and ending where the next specifier begins
  // console.log(`removing up to next named import for ${exportToRemove.local.name}`);
  let start = importSpecifierToRemove.range[0];
  let end = nextSibling.range[0];
  return [start, end];
}

function reportRuleViolation(violation) {
  let { context, declaration, lastImportNode, rangesToRemove, newTypeImports } = violation;

  context.report({
    message: RULE_FAILURE_MESSAGE,
    node: declaration,
    fix(fixer) {
      let changes = [];
      if (lastImportNode) {
        // place at the end of all import statements
        changes.push(fixer.insertTextAfter(lastImportNode, newTypeImports));
      } else {
        // no more ES imports remain after we remove this one
        changes.push(fixer.insertTextBeforeRange(declaration.range, newTypeImports));
      }
      rangesToRemove.forEach((range) => {
        changes.push(fixer.removeRange(range));
      });
      return changes;
    },
  });
}

function lintDeclarationForTypeOnlyImports(declaration, usageData, context) {
  let { imports, usedImports, usedTypes, paramsForType, lastImportNode } = usageData;
  let unusedImports = getSpecifiersNotUsedByJS(declaration, usedImports);
  let typeOnlyImports = getTypeOnlySpecifiers(unusedImports, usedTypes);

  if (typeOnlyImports.length === 0) {
    // nothing to do for this declaration
    return;
  }

  let remaining = getRemainingSpecifiers(declaration, typeOnlyImports);
  let importStatements = typeOnlyImports.map((specifier) => {
    let name = specifier.local.name;
    let info = imports[name];
    let realName = info.isDefault ? 'default' : info.imported.name;

    // curry type generics params if necessary
    let paramString = createParamStringForGenerics(paramsForType[name]);

    return `\ntype ${name}${paramString} = import('${imports[name].from.value}').${realName}${paramString};`;
  });

  let newTypeImports = importStatements.join('');
  let rangesToRemove;

  if (remaining.length === 0) {
    // if this is the import we are removing
    // we have to alter where we will do insertion
    if (lastImportNode === declaration) {
      let decs = usageData.declarations;

      if (decs.length > 1) {
        lastImportNode = decs[decs.length - 2];
      } else {
        lastImportNode = null;
      }
    }

    // if nothing remains everything converts to a type Import
    let [start, end] = declaration.range;
    let range = [start, end + 1];
    rangesToRemove = [range];
  } else {
    let removedRanges = [];
    typeOnlyImports.forEach((specifier) => {
      removedRanges.push(getRangeToRemove(specifier));
    });
    rangesToRemove = collapseRanges(removedRanges);
  }

  reportRuleViolation({
    context,
    declaration,
    lastImportNode,
    rangesToRemove,
    newTypeImports,
  });
}

module.exports = {
  name: 'prefer-static-type-import',
  meta: {
    type: 'Suggestion',
    docs: {
      description:
        "Requires using type-only import syntax `type X = import('./foo').X`" +
        'for imports that are only used for type information. This prevents cycles' +
        ' from developing in ES Imports, simplifies things for rollup, and avoids ' +
        'accidental library size bloat from imports and exports that are left behind ' +
        'after stripping away type information.',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [],
    messages: {},
    fixable: 'code',
  },
  defaultOptions: [],
  create(context) {
    let imports, usedImports, usedTypes, paramsForType, lastImportNode, declarations;
    return {
      Program() {
        declarations = [];
        imports = {};
        usedImports = {};
        usedTypes = {};
        paramsForType = {};
        lastImportNode = null;
      },
      'Program:exit'() {
        // console.log('\n\n\nProgram:exitBegin\n======\n');
        // eslint will only pass over a file 10x before bailing
        // our approach lets us autofix more things by collapsing fixes for
        // a single import declaration into one error+change instead of fix
        // by individual imports within a declaration
        let usageData = {
          imports,
          usedImports,
          usedTypes,
          paramsForType,
          lastImportNode,
          declarations,
        };
        for (let i = 0; i < declarations.length; i++) {
          lintDeclarationForTypeOnlyImports(declarations[i], usageData, context);
        }
        // console.log('\nProgram:exitEnd\n======\n\n\n');
      },
      ImportDeclaration(node) {
        declarations.push(node);
        lastImportNode = node;
      },
      ImportDefaultSpecifier(node) {
        imports[node.local.name] = {
          local: node.local,
          imported: node.imported || node.local,
          from: node.parent.source,
          isDefault: true,
        };
      },
      ImportSpecifier(node) {
        imports[node.local.name] = {
          local: node.local,
          imported: node.imported || node.local,
          from: node.parent.source,
          isDefault: false,
        };
      },
      Identifier(node) {
        if (!isMaybeUsage(node, imports)) {
          return;
        }

        let scope = context.getScope();
        if (scope.type === 'class') {
          usedImports[node.name] = true;
        } else if (identifierIsModuleScopeReference(node, scope)) {
          usedImports[node.name] = true;
        }
      },
      TSTypeReference(node) {
        let identifier = node.typeName;
        if (imports[identifier.name] !== undefined) {
          // console.log(`found used type ${identifier.name}`);
          usedTypes[identifier.name] = true;
          let maxParamsSeen = paramsForType[identifier.name] || 0;

          if (node.typeParameters && node.typeParameters.params.length > maxParamsSeen) {
            // this type usage contains generics e.g. `Dict<Thing>`
            // so we save off how many params it uses to fix up the import
            // later
            maxParamsSeen = node.typeParameters.params.length;
            usedTypes[identifier.name] = node.typeParameters.params.length;
          }

          paramsForType[identifier.name] = maxParamsSeen;
        }
      },
    };
  },
};
