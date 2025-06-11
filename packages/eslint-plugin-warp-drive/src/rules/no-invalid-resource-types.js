'use strict';

const { dasherize, singularize } = require('inflection');

const STORE_METHOD_NAMES = new Set([
  'findRecord',
  'findAll',
  'query',
  'queryRecord',
  'adapterFor',
  'serializerFor',
  'modelFor',
  'peekRecord',
  'peekAll',
]);
const ImportedBuilders = {
  '@ember-data/legacy-compat/builders': ['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'],
  '@ember-data/rest/request': ['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'],
  '@ember-data/json-api/request': ['findAll', 'findRecord', 'query', 'postQuery', 'queryRecord', 'saveRecord'],
  '@ember-data/active-record/request': ['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'],
  '@warp-drive/legacy/compat/builders': ['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'],
  '@warp-drive/utilities/rest': ['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'],
  '@warp-drive/utilities/json-api': ['findAll', 'findRecord', 'query', 'postQuery', 'queryRecord', 'saveRecord'],
  '@warp-drive/utilities/active-record': ['findAll', 'findRecord', 'query', 'queryRecord', 'saveRecord'],
  '@ember-data/model': ['hasMany', 'belongsTo'],
  '@warp-drive/legacy/model': ['hasMany', 'belongsTo'],
};

const STORE_SERVICE_NAMES = new Set(['store', 'db', 'v2Store', 'v1Store']);
const ARG_NAMES = new Set(['store', 'db', 'v2Store', 'v1Store', 'this']);
const RULE_ID = 'warp-drive.no-invalid-resource-types';

function buildNormalizeFn(config) {
  const mod = require(config.moduleName);
  const chain = config.methodNames.map((name) => mod[name]);
  if (chain.length === 1) {
    return chain[0];
  }

  console.log({
    chain,
  });

  return (str) => {
    let val = str;
    for (const link of chain) {
      val = link(val);
    }
    return val;
  };
}

function mergeConfig(userConfigs = []) {
  if (userConfigs.length > 1) {
    throw new Error(`Expected only one configuration object for the rule ${RULE_ID}`);
  }
  const userConfig = userConfigs[0] ?? {};
  return {
    serviceNames: userConfig.serviceNames ? new Set(userConfig.serviceNames) : STORE_SERVICE_NAMES,
    argNames: userConfig.argNames
      ? new Set(userConfig.argNames)
      : userConfig.serviceNames
        ? new Set(userConfig.serviceNames)
        : ARG_NAMES,
    imports: Object.assign({}, ImportedBuilders, userConfig.imports),
    normalize: userConfig.normalize ? buildNormalizeFn(userConfig.normalize) : (str) => dasherize(singularize(str)),
  };
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: {
      [RULE_ID]: `{{source}}.{{methodName}} should be called with \`'{{normalizedType}}'\` instead of \`'{{actualType}}'\``,
      [RULE_ID + '.invalid-input']:
        `{{source}}.{{methodName}} should be called with a non-empty string instead of '{{actualType}}'\``,
      [RULE_ID + '.invalid-import']:
        `\`import { {{importedName}} } from '{{source}}';\` should be called with \`'{{normalizedType}}'\` instead of \`'{{actualType}}'\``,
      [RULE_ID + '.invalid-import-input']:
        `\`import { {{importedName}} } from '{{source}}';\` should be called with a non-empty string instead of '{{actualType}}'\``,
      [RULE_ID + '.invalid-import-renamed']:
        `\`import { {{importedName}} as {{localName}} } from '{{source}}';\` should be called with \`'{{normalizedType}}'\` instead of \`'{{actualType}}'\``,
      [RULE_ID + '.invalid-import-input-renamed']:
        `\`import { {{importedName}} as {{localName}} } from '{{source}}';\` should be called with a non-empty string instead of '{{actualType}}'\``,
    },
    docs: {
      description:
        'require the uses of resource-type to follow a convention. Configurable, defaults to singular dasherized.',
      category: 'Best Practices',
      recommended: true,
      url: `https://github.com/emberjs/data/tree/main/packages/eslint-plugin-warp-drive/docs/rules/no-invalid-resource-types.md`,
    },
    schema: false,
  },

  create(context) {
    const config = mergeConfig(context.options);

    return {
      ImportDeclaration(node) {
        if (!config.imports[node.source.value]) {
          return;
        }

        const toAnalyze = config.imports[node.source.value];
        const variables = context.sourceCode.getDeclaredVariables(node);

        for (const variable of variables) {
          const names = getImportNames(variable);
          if (toAnalyze.includes(names.importedName)) {
            for (const ref of variable.references) {
              if (ref.identifier.parent.type === 'CallExpression') {
                processImportUsage(context, ref.identifier.parent, config, {
                  source: node.source.value,
                  importedName: names.importedName,
                  localName: names.localName,
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

function processImportUsage(context, node, config, opts) {
  // only match call expressions that have arguments
  // where the first argument is a literal
  // we will validate later that it is a meaningful string
  if (
    !node.arguments ||
    !node.arguments.length ||
    (node.arguments[0].type !== 'Literal' && node.arguments[0].type !== 'ObjectExpression')
  ) {
    return;
  }
  const value = node.arguments[0];
  const { source, importedName, localName } = opts;
  maybeReportImportError(context, node, config, {
    source: source,
    importedName,
    localName,
    value,
  });
}

function getImportNames(variable) {
  const localName = variable.name;
  if (variable.identifiers.length) {
    const token = variable.identifiers[0];
    if (token.name === localName && token.parent.type === 'ImportSpecifier' && token.parent.imported) {
      return {
        localName: localName,
        importedName: token.parent.imported.name,
      };
    }
  }
  return {
    localName,
    importedName: localName,
  };
}

function processStoreAPIUsage(context, node, config) {
  // only match call expressions that have arguments
  // where the first argument is a literal
  // we will validate later that it is a meaningful string
  if (
    !node.arguments ||
    !node.arguments.length ||
    (node.arguments[0].type !== 'Literal' && node.arguments[0].type !== 'ObjectExpression')
  ) {
    return;
  }
  const value = node.arguments[0];

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

  const actualValue = value.type === 'Literal' ? value : fromObjectExpression(value, 'type');
  if (actualValue === null) {
    return;
  }
  const actualType = actualValue.value;

  if (typeof actualType !== 'string' || actualType.length === 0) {
    context.report({
      node: actualValue,
      messageId: RULE_ID + '.invalid-import-input' + (importedName !== localName ? '-renamed' : ''),
      data: { source, importedName, localName, actualType },
    });
  } else {
    const normalizedType = config.normalize(actualType);
    if (normalizedType !== actualType) {
      context.report({
        node: actualValue,
        messageId: RULE_ID + '.invalid-import' + (importedName !== localName ? '-renamed' : ''),
        data: { source, importedName, localName, normalizedType, actualType },
        fix(fixer) {
          return fixer.replaceText(actualValue, `'${normalizedType}'`);
        },
      });
    }
  }
}

function maybeReportError(context, node, config, data) {
  const { source, methodName, value } = data;

  const actualValue = value.type === 'Literal' ? value : fromObjectExpression(value, 'type');
  if (actualValue === null) {
    return;
  }
  const actualType = actualValue.value;

  if (typeof actualType !== 'string' || actualType.length === 0) {
    context.report({
      node: actualValue,
      messageId: RULE_ID + '.invalid-input',
      data: { source, methodName, actualType },
    });
  } else {
    const normalizedType = config.normalize(actualType);
    if (normalizedType !== actualType) {
      context.report({
        node: actualValue,
        messageId: RULE_ID,
        data: { source, methodName, normalizedType, actualType },
        fix(fixer) {
          return fixer.replaceText(actualValue, `'${normalizedType}'`);
        },
      });
    }
  }
}
