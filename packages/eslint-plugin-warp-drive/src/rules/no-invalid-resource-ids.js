'use strict';

const { dasherize, singularize } = require('inflection');

const STORE_METHOD_NAMES = new Set(['findRecord', 'peekRecord']);
const ImportedBuilders = {
  '@ember-data/legacy-compat/builders': ['findRecord'],
  '@ember-data/rest/request': ['findRecord'],
  '@ember-data/json-api/request': ['findRecord'],
  '@ember-data/active-record/request': ['findRecord'],
  '@warp-drive/legacy/compat/builders': ['findRecord'],
  '@warp-drive/utilities/rest': ['findRecord'],
  '@warp-drive/utilities/json-api': ['findRecord'],
  '@warp-drive/utilities/active-record': ['findRecord'],
};

const STORE_SERVICE_NAMES = new Set(['store', 'db', 'v2Store', 'v1Store']);
const ARG_NAMES = new Set(['store', 'db', 'v2Store', 'v1Store', 'this']);
const RULE_ID = 'warp-drive.no-invalid-resource-ids';

function mergeConfig(userConfig = {}) {
  return {
    serviceNames: userConfig.serviceNames ? new Set(userConfig.serviceNames) : STORE_SERVICE_NAMES,
    argNames: userConfig.argNames
      ? new Set(userConfig.argNames)
      : userConfig.serviceNames
        ? new Set(userConfig.serviceNames)
        : ARG_NAMES,
    imports: Object.assign({}, ImportedBuilders, userConfig.imports),
    normalize: userConfig.normalize ? userConfig.normalize : (str) => dasherize(singularize(str)),
  };
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: {
      [RULE_ID]: `{{source}}.{{methodName}} should be called with the string id \`{{normalizedId}}\` instead of the {{idType}} id \`{{actualId}}\``,
      [RULE_ID + '.invalid-input']: `{{source}}.{{methodName}} should be called with a non-empty string id`,
      [RULE_ID + '.invalid-import']:
        `\`import { {{importedName}} } from '{{source}}';\` should be called with the string id \`{{normalizedId}}\` instead of the {{idType}} id \`{{actualId}}\``,
      [RULE_ID + '.invalid-import-input']:
        `\`import { {{importedName}} } from '{{source}}';\` should be called with a non-empty string id`,
      [RULE_ID + '.invalid-import-renamed']:
        `\`import { {{importedName}} as {{localName}} } from '{{source}}';\` should be called with the string id \`{{normalizedId}}\` instead of the {{idType}} id \`{{actualId}}\``,
      [RULE_ID + '.invalid-import-input-renamed']:
        `\`import { {{importedName}} as {{localName}} } from '{{source}}';\` should be called with a non-empty string id`,
    },
    docs: {
      description: 'requires the uses of a resource ID to be strings.',
      category: 'Best Practices',
      recommended: true,
      url: `https://github.com/emberjs/data/tree/main/packages/eslint-plugin-warp-drive/docs/rules/no-invalid-resource-ids.md`,
    },
    schema: false,
  },

  create(context) {
    // console.log(`options`, context.options);
    const config = mergeConfig(context.options);

    return {
      ImportDeclaration(node) {
        if (!config.imports[node.source.value]) {
          return;
        }

        const toAnalyze = config.imports[node.source.value];
        const variables = context.sourceCode.getDeclaredVariables(node);

        for (const variable of variables) {
          if (toAnalyze.includes(variable.name)) {
            for (const ref of variable.scope.references) {
              if (ref.identifier.parent.type === 'CallExpression') {
                processImportUsage(context, ref.identifier.parent, config, {
                  source: node.source.value,
                  importedName: variable.name,
                  localName: variable.name,
                });
              }
            }
          }
        }
      },
      CallExpression(node) {
        // prettier-ignore
        if (node.callee.type === 'MemberExpression')
          return processStoreAPIUsage(context, node, config);
      },
    };
  },
};

function extractArg(args) {
  if (!args || !args.length) {
    return null;
  }
  if (args[0].type === 'ObjectExpression') {
    return args[0];
  }
  if (args.length < 2 || args[1].type !== 'Literal') {
    return null;
  }
  return args[1];
}

function processImportUsage(context, node, config, opts) {
  const value = extractArg(node.arguments);
  if (!value) {
    return;
  }
  const { source, importedName, localName } = opts;
  maybeReportImportError(context, node, config, {
    source: source,
    importedName,
    localName,
    value,
  });
}

function processStoreAPIUsage(context, node, config) {
  const value = extractArg(node.arguments);
  if (!value) {
    return;
  }

  // ignore computed expressions
  // e.g. ignore `foo[bar]()`
  if (node.callee.computed) {
    return;
  }

  const propertyName = node.callee.property.name;
  if (!STORE_METHOD_NAMES.has(propertyName)) return;

  // ignore computed member expressions
  // e.g. ignore `foo[bar].baz()`
  if (node.callee.object.type === 'MemberExpression' && node.callee.object.computed) {
    return;
  }

  const type = node.callee.object.type;
  if (type !== 'ThisExpression' && type !== 'Identifier' && type !== 'MemberExpression') {
    // anything else we just don't even wanna try
    // for instance `/expr/.test(val)` is a valid call expression
    return;
  }

  if (node.callee.object.type === 'Identifier') {
    // e.g. store.findRecord()
    if (!config.argNames.has(node.callee.object.name)) return;
    maybeReportError(context, node, config, {
      source: node.callee.object.name,
      methodName: propertyName,
      value,
    });
  } else if (node.callee.object.type === 'ThisExpression') {
    // e.g. this.findRecord()
    if (!config.argNames.has('this')) return;
    maybeReportError(context, node, config, { source: 'this', methodName: propertyName, value });
  } else {
    // e.g. this.store.findRecord()
    if (!config.serviceNames.has(node.callee.object.property.name)) return;
    maybeReportError(context, node, config, {
      source: `this.${node.callee.object.property.name}`,
      methodName: propertyName,
      value,
    });
  }
}

function fromObjectExpression(obj, name) {
  for (const prop of obj.properties) {
    if (prop.key.type === 'Identifier' && prop.key.name === name) {
      if (prop.value.type !== 'Literal') {
        return null;
      }

      return prop.value;
    }
  }
  return null;
}

function maybeReportImportError(context, node, config, data) {
  const { source, importedName, localName, value } = data;

  const actualValue = value.type === 'Literal' ? value : fromObjectExpression(value, 'id');
  if (actualValue === null) {
    return;
  }
  const actualId = actualValue.value;

  if (actualId === null || typeof actualId === 'undefined' || actualId === '') {
    context.report({
      node: actualValue,
      messageId: RULE_ID + '.invalid-import-input' + (importedName !== localName ? '-renamed' : ''),
      data: { source, importedName, localName, idType: typeForValue(actualId), actualId },
    });
  } else {
    const normalizedId = String(actualId);
    if (normalizedId !== actualId) {
      context.report({
        node: actualValue,
        messageId: RULE_ID + '.invalid-import' + (importedName !== localName ? '-renamed' : ''),
        data: { source, importedName, localName, normalizedId, idType: typeForValue(actualId), actualId },
        fix(fixer) {
          return fixer.replaceText(actualValue, `'${normalizedId}'`);
        },
      });
    }
  }
}

function maybeReportError(context, node, config, data) {
  const { source, methodName, value } = data;
  const actualValue = value.type === 'Literal' ? value : fromObjectExpression(value, 'id');
  if (actualValue === null) {
    return;
  }
  const actualId = actualValue.value;

  if (actualId === null || typeof actualId === 'undefined' || actualId === '') {
    context.report({
      node: actualValue,
      messageId: RULE_ID + '.invalid-input',
      data: { source, methodName, actualId, idType: typeForValue(actualId) },
    });
  } else {
    const normalizedId = String(actualId);
    if (normalizedId !== actualId) {
      context.report({
        node: actualValue,
        messageId: RULE_ID,
        data: { source, methodName, normalizedId, idType: typeForValue(actualId), actualId },
        fix(fixer) {
          return fixer.replaceText(actualValue, `'${normalizedId}'`);
        },
      });
    }
  }
}

function typeForValue(actualId) {
  if (actualId === null) {
    return 'null';
  }

  const type = typeof actualId;

  switch (type) {
    case 'number':
      return 'numeric';
    default:
      return type;
  }
}
