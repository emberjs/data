// @ts-check

const messageId = 'noCreateRecordRerender';
const createRecordExpression = 'CallExpression[callee.property.name="createRecord"]';
const emberObjectExtendExpression = 'CallExpression[callee.property.name="extend"]';
const forbiddenParentMethodKeyNames = [
  'init',
  'initRecord', // legacy modals
  'didReceiveAttrs',
  'willRender',
  'didInsertElement',
  'didRender',
  'didUpdateAttrs',
  'willUpdate',
  'willDestroyElement',
  'willClearRender',
  'didDestroyElement',
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow use of `store.createRecord` in getters, constructors, and class properties',
      category: 'Possible Errors',
      recommended: true,
      url: 'https://github.com/emberjs/data/tree/main/packages/eslint-plugin-warp-drive/docs/rules/no-create-record-rerender.md',
    },
    messages: {
      [messageId]:
        'Cannot call `store.createRecord` in {{location}}. Calling `store.createRecord` inside constructors, getters, and class properties can cause issues with re-renders.',
    },
  },

  create(context) {
    return {
      /**
       * Handle class constructor
       * @param {import('eslint').Rule.Node} node
       */
      [`MethodDefinition[kind="constructor"] ${createRecordExpression}`](node) {
        const maybeParentFunction = getParentFunction(node);
        if (maybeParentFunction && !parentFunctionIsConstructor(maybeParentFunction)) {
          return;
        }
        context.report({
          node,
          messageId,
          data: { location: 'a constructor' },
        });
      },

      /**
       * Handle class getter
       * @param {import('eslint').Rule.Node} node
       */
      [`MethodDefinition[kind="get"] ${createRecordExpression}`](node) {
        context.report({
          node,
          messageId,
          data: { location: 'a getter' },
        });
      },

      /**
       * Handle class property initializer
       * @param {import('eslint').Rule.Node} node
       */
      [`PropertyDefinition ${createRecordExpression}`](node) {
        if (getParentFunction(node)) {
          return;
        }
        context.report({
          node,
          messageId,
          data: { location: 'a class property initializer' },
        });
      },

      /**
       * Handle lifecycle hooks in a class
       * @param {import('eslint').Rule.Node} node
       */
      [`MethodDefinition[key.name=/${forbiddenParentMethodKeyNames.join('|')}/] FunctionExpression ${createRecordExpression}`](
        node
      ) {
        const maybeParentFunction = getParentFunction(node);
        if (maybeParentFunction && !parentFunctionIsInit(maybeParentFunction)) {
          return;
        }
        context.report({
          node,
          messageId,
          data: { location: 'a lifecycle hook' },
        });
      },

      /**
       * Handle the init method in an EmberObject
       * @param {import('eslint').Rule.Node} node
       */
      [`${emberObjectExtendExpression} Property[key.name=/${forbiddenParentMethodKeyNames.join('|')}/] FunctionExpression ${createRecordExpression}`](
        node
      ) {
        const maybeParentFunction = getParentFunction(node);
        if (maybeParentFunction && !parentFunctionIsInit(maybeParentFunction)) {
          return;
        }
        context.report({
          node,
          messageId,
          data: { location: 'a lifecycle hook' },
        });
      },

      /**
       * Handle a property initializer in an EmberObject
       * @param {import('eslint').Rule.Node} node
       */
      [`${emberObjectExtendExpression} Property > ${createRecordExpression}`](node) {
        context.report({
          node,
          messageId,
          data: { location: 'an object property initializer' },
        });
      },
    };
  },
};

function getParentFunction(/** @type {import('eslint').Rule.Node} */ node) {
  if (node.parent) {
    if (node.parent.type === 'ArrowFunctionExpression' || node.parent.type === 'FunctionExpression') {
      return node.parent;
    } else if (node.parent.type === 'ClassBody') {
      return null;
    }
    return getParentFunction(node.parent);
  }
  return null;
}

/**
 *
 * @param {import('eslint').Rule.Node} maybeParentFunction
 * @returns {boolean}
 */
function parentFunctionIsConstructor(maybeParentFunction) {
  return 'kind' in maybeParentFunction.parent && maybeParentFunction.parent.kind === 'constructor';
}

/**
 *
 * @param {import('eslint').Rule.Node} maybeParentFunction
 * @returns {boolean}
 */
function parentFunctionIsInit(maybeParentFunction) {
  return (
    'key' in maybeParentFunction.parent &&
    maybeParentFunction.parent.key.type === 'Identifier' &&
    forbiddenParentMethodKeyNames.includes(maybeParentFunction.parent.key.name)
  );
}
