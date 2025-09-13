'use strict';

const AJAX_SERVICE_NAMES = new Set(['apiAjax', 'ajax', 'najax']);
const METHOD_OBJECT_NAMES = new Set(['$']);
const OBJECT_PROPERTY_NAMES = new Set([
  'get',
  'post',
  'put',
  'delete',
  'request',
  'patch',
  'query',
  'ajax',
  'fetch',
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'QUERY',
]);
const ANY_METHOD_NAMES = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'QUERY']);
const OBJECT_NAMES = new Set(['$', 'jQuery', 'jQ', 'najax']);
const FUNCTION_NAMES = new Set(['fetch', 'najax', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'QUERY']);
const CONSTRUCTOR_NAMES = new Set(['XMLHttpRequest']);
const RULE_ID = 'warp-drive.no-external-request-patterns';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    messages: {
      [RULE_ID]: `Use \`store.request()\` instead of \`{{ objectName }}.{{propertyName}}()\``,
      [`${RULE_ID}.no-method`]: `Use \`store.request()\` instead of \`{{functionName}}()\``,
    },
    docs: {
      description: 'Restricts usage of discouraged non-warp-drive request patterns',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/warp-drive-data/warp-drive/tree/main/packages/eslint-plugin-warp-drive/docs/no-external-request-patterns.md',
    },
  },

  create(context) {
    return {
      NewExpression(node) {
        if (CONSTRUCTOR_NAMES.has(node.callee.name)) {
          context.report({
            node,
            messageId: `${RULE_ID}.no-method`,
            data: { functionName: node.callee.name },
          });
        }
      },
      CallExpression(node) {
        // only match call expressions that are member expressions
        // e.g. ignore `foo()`
        if (node.callee.type !== 'MemberExpression') {
          // check for function names
          if (node.callee.type === 'Identifier' && FUNCTION_NAMES.has(node.callee.name)) {
            context.report({
              node,
              messageId: `${RULE_ID}.no-method`,
              data: { functionName: node.callee.name },
            });
          }

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
          // unless we match one of ANY_METHOD_NAMES
          if (ANY_METHOD_NAMES.has(propertyName)) {
            context.report({
              node,
              messageId: RULE_ID,
              data: { objectName: '<object>', propertyName },
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

        if (type !== 'ThisExpression') {
          // check for common object names
          if (OBJECT_NAMES.has(node.callee.object.name)) {
            if (OBJECT_PROPERTY_NAMES.has(propertyName)) {
              context.report({
                node,
                messageId: RULE_ID,
                data: { objectName: node.callee.object.name, propertyName },
              });
            }
            return;
          }
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

        if (METHOD_OBJECT_NAMES.has(objectName)) {
          if (OBJECT_PROPERTY_NAMES.has(propertyName)) {
            context.report({
              node,
              messageId: RULE_ID,
              data: { objectName, propertyName },
            });
          }
          return;
        }
        if (AJAX_SERVICE_NAMES.has(objectName)) {
          // all use of apiAjax is discouraged so we print this regardless of what the method is.
          context.report({
            node,
            messageId: RULE_ID,
            data: { objectName, propertyName },
          });
          return;
        }
        if (ANY_METHOD_NAMES.has(propertyName)) {
          context.report({
            node,
            messageId: RULE_ID,
            data: { objectName, propertyName },
          });
        }
      },
    };
  },
};
