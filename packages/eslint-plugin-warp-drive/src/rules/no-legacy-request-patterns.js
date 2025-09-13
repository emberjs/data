'use strict';

const STORE_METHOD_NAMES = new Set([
  'findRecord',
  'findAll',
  'query',
  'queryRecord',
  'adapterFor',
  'serializerFor',
  'saveRecord',
  'peekRecord',
  'peekAll',
]);
const STORE_SERVICE_NAMES = new Set(['store', 'db', 'v2Store', 'v1Store']);
const MODEL_METHOD_NAMES = new Set(['save', 'destroyRecord', 'reload']);
const RULE_ID = 'warp-drive.no-legacy-request-patterns';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    messages: {
      [RULE_ID]: `Use \`store.request()\` instead of \`{{ objectName }}.{{propertyName}}()\``,
    },
    docs: {
      description: 'require the use of `store.request()` instead of legacy request patterns',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/warp-drive-data/warp-drive/tree/main/packages/eslint-plugin-warp-drive/docs/no-legacy-request-patterns.md',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // only match call expressions that are member expressions
        // e.g. ignore `foo()`
        if (node.callee.type !== 'MemberExpression') {
          return;
        }

        // ignore computed expressions
        // e.g. ignore `foo[bar]()`
        if (node.callee.computed) {
          return;
        }

        const propertyName = node.callee.property.name;

        // ignore computed member expressions
        // e.g. ignore `foo[bar].baz()`
        if (node.callee.object.type === 'MemberExpression' && node.callee.object.computed) {
          // unless we match one of MODEL_METHOD_NAMES
          if (MODEL_METHOD_NAMES.has(propertyName)) {
            context.report({
              node,
              messageId: RULE_ID,
              data: { objectName: 'record', propertyName },
            });
          }
          return;
        }

        const type = node.callee.object.type;

        if (type !== 'ThisExpression' && type !== 'Identifier' && type !== 'MemberExpression') {
          // anything else we just don't even wanna try
          // for instance `/expr/.test(val)` is a valid call expression
          return;
        }

        const objectName =
          // store.findRecord()
          node.callee.object.type === 'Identifier'
            ? node.callee.object.name
            : // this.findRecord()
              node.callee.object.type === 'ThisExpression'
              ? 'this'
              : // this.store.findRecord()
                node.callee.object.property.name;

        if (STORE_SERVICE_NAMES.has(objectName)) {
          if (STORE_METHOD_NAMES.has(propertyName)) {
            context.report({
              node,
              messageId: RULE_ID,
              data: { objectName, propertyName },
            });
          }
          return;
        } else if (MODEL_METHOD_NAMES.has(propertyName)) {
          context.report({
            node,
            messageId: RULE_ID,
            data: { objectName, propertyName },
          });
          return;
        }
      },
    };
  },
};
