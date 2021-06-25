const collapseRanges = require('./utils/collapse-ranges');

const RULE_FAILURE_MESSAGE = `TS Type alias dynamic 'import()' usage should be converted to static 'import type' syntax.`;

function reportRuleViolation(violation) {
  let { context, declarations, lastImportNode, rangesToRemove, newTypeImports } = violation;

  context.report({
    message: RULE_FAILURE_MESSAGE,
    node: declarations[0], // report from perspective of first declaration
    fix(fixer) {
      let changes = [];
      if (lastImportNode) {
        // place at the end of all import statements
        changes.push(fixer.insertTextAfter(lastImportNode, newTypeImports));
      } else {
        // no more ES imports remain after we remove this one
        changes.push(fixer.insertTextBeforeRange(rangesToRemove[rangesToRemove.length - 1], newTypeImports));
      }
      rangesToRemove.forEach((range) => {
        changes.push(fixer.removeRange(range));
      });
      return changes;
    },
  });
}

function lintDeclarationForTypeOnlyImports(declarations, lastImportNode, context) {
  let rangesToRemove = [];
  let newTypeImports = '';
  for (let i = 0; i < declarations.length; i++) {
    let declaration = declarations[i];
    let name = declaration.typeAnnotation.qualifier.name;
    let localName = declaration.id.name;
    let isDefault = name === 'default';
    let isRenamed = !isDefault && name !== localName;
    let location = declaration.typeAnnotation.parameter.literal.raw;
    let importNameStr = '';

    if (isDefault) {
      importNameStr = `${localName}`;
    } else if (isRenamed) {
      importNameStr = `{ ${name} as ${localName} }`;
    } else {
      importNameStr = `{ ${localName} }`;
    }

    newTypeImports += `\nimport type ${importNameStr} from ${location};`;
    let [start, end] = declaration.range;
    rangesToRemove.push([start, end]);
  }

  reportRuleViolation({
    context,
    declarations,
    lastImportNode,
    rangesToRemove: collapseRanges(rangesToRemove),
    newTypeImports,
  });
}

module.exports = {
  name: 'prefer-static-type-import-syntax',
  meta: {
    type: 'Suggestion',
    docs: {
      description:
        "Requires converting type-only import syntax from `type X = import('./foo').X`;" +
        "to `import type { X } from './foo';` for imports that are only used for type information." +
        'This prevents cycles from developing in ES Imports, simplifies things for rollup, and avoids ' +
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
    let lastImportNode, declarations;
    return {
      Program() {
        declarations = [];
        lastImportNode = null;
      },
      'Program:exit'() {
        // eslint will only pass over a file 10x before bailing
        // our approach lets us autofix more things by collapsing fixes for
        // a single import declaration into one error+change instead of fix
        // by individual imports within a declaration
        if (declarations.length > 0) {
          lintDeclarationForTypeOnlyImports(declarations, lastImportNode, context);
        }
      },
      ImportDeclaration(node) {
        if (node.importKind === 'value') {
          lastImportNode = node;
        }
      },
      TSTypeAliasDeclaration(node) {
        if (node.typeAnnotation && node.typeAnnotation.type === 'TSImportType') {
          declarations.push(node);
        }
      },
    };
  },
};
