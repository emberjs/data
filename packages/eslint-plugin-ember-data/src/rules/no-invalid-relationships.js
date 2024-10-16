/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require inverse to be specified in @belongsTo and @hasMany decorators',
      category: 'Ember Data',
      recommended: false,
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/require-async-inverse-relationship.md',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const decorator =
          node.parent.type === 'Decorator' &&
          ['belongsTo', 'hasMany'].includes(node.callee.name) &&
          node;

        if (decorator) {
          const args = decorator.arguments;
          const hasAsync = args.some(
            (arg) =>
              arg.type === 'ObjectExpression' &&
              arg.properties.some((prop) => prop.key.name === 'async')
          );
          const hasBooleanAsync = args.some(
            (arg) =>
              arg.type === 'ObjectExpression' &&
              arg.properties.some(
                (prop) => prop.key.name === 'async' && typeof prop.value.value === 'boolean'
              )
          );
          const hasInverse = args.some(
            (arg) =>
              arg.type === 'ObjectExpression' &&
              arg.properties.some((prop) => prop.key.name === 'inverse')
          );

          if (!hasAsync) {
            context.report({
              node,
              message: 'The @{{decorator}} decorator requires an `async` property to be specified.',
              data: {
                decorator: decorator.callee.name,
              },
            });
          } else if (!hasBooleanAsync) {
            context.report({
              node,
              message:
                'The @{{decorator}} decorator requires an `async` property to be specified as a boolean.',
              data: {
                decorator: decorator.callee.name,
              },
            });
          }

          if (!hasInverse) {
            context.report({
              node,
              message:
                'The @{{decorator}} decorator requires an `inverse` property to be specified.',
              data: {
                decorator: decorator.callee.name,
              },
            });
          }
        }
      },
    };
  },
};